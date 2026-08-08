# CCTV Occupancy Service

Standalone FastAPI microservice. Detects vehicles in a camera frame
(YOLOv8, pretrained on COCO — no custom training needed for the
hackathon), separates them into **charger slots** (cars actively
charging) and a **queue area** (cars waiting), and estimates wait time
from both signals together. Completely decoupled from the Next.js app
— test it on its own before wiring anything up.

> **Breaking change from the first version of this service:** the
> `rois` form field is now `charger_rois`, and there's a new optional
> `queue_rois` field alongside it. If you had saved `curl` commands or
> a calibration export using the old `rois` name, rename it.

## Setup

```bash
cd cv-service
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
uvicorn main:app --reload --port 8000
```

The YOLOv8n weights (~6MB) download automatically on first run.

**Get the service role key** from Supabase Dashboard → Project Settings
→ API → `service_role` (not `anon` — this key bypasses RLS, so never
expose it to a browser or commit it to git; `.gitignore` in the project
root already excludes `.env`).

## Test it standalone (no Next.js, no Supabase needed)

```bash
curl -X POST http://localhost:8000/analyze/frame \
  -F "file=@/path/to/any/parking-lot-photo.jpg" \
  -F "station_id=00000000-0000-0000-0000-000000000000" \
  -F "total_chargers=4" \
  -F "persist=false"
```

`persist=false` skips the Supabase write, so this works even before
`.env` is filled in. Any photo with vehicles in it works for a smoke
test — the model doesn't know or care that it's not really a charging
station.

## How occupancy + queue detection works

1. **Vehicle detection** — YOLOv8n finds cars/motorcycles/buses/trucks
   in the frame (`occupancy.py: detect_vehicles`).
2. **Charger slot assignment** — each detected vehicle's center point
   is checked against every **charger** ROI. A slot is "occupied" if a
   vehicle center falls inside it (`assign_to_rois`).
3. **Queue count** — separately, each vehicle's center is checked
   against the **queue** ROI(s). Every vehicle found in a queue region
   is counted once, even if it happens to overlap more than one queue
   box (`count_vehicles_in_regions`).
4. **ROIs** — pass calibrated pixel boxes as `charger_rois` and
   `queue_rois` (JSON, e.g.
   `[{"slot_label": "Charger 01", "x1":10,"y1":20,"x2":200,"y2":400}, ...]`),
   or omit either and the service falls back to a rough guess:
   `auto_grid_rois` (even vertical columns) for chargers,
   `auto_queue_roi` (bottom quarter of the frame) for the queue.
   Both fallbacks are demo-only — see "Calibrating real ROIs" below.
5. **Wait estimate** (`estimate_wait_minutes`):
   - Any charger slot free → **0 minutes**, regardless of queue length
     — a driver can plug in immediately.
   - All slots full → wait scales with how many cars are already
     queued: `(queue_length + 1) * AVG_SESSION_MIN / total_chargers`.
     A new arrival needs that many chargers to free up before their
     turn, and chargers free up at a combined rate of
     `total_chargers` per `AVG_SESSION_MIN` minutes. With
     `queue_length=0` this reduces to the original formula, so a
     station with no calibrated queue ROI behaves exactly as before.
   - This is a simple M/M/c-style approximation, not a queueing
     guarantee — good enough for ranking stations against each other,
     not a promise to a driver. Tune `CV_AVG_SESSION_MIN` in `.env`.

## Endpoints

| Endpoint | Use |
|---|---|
| `GET /health` | Liveness check, also reports whether Supabase is configured |
| `POST /analyze/frame` | Single image — instant read |
| `POST /analyze/frame/debug` | Same detection, but returns an annotated JPEG instead of JSON — see "Debugging bad results" below |
| `POST /analyze/video` | Short clip — samples frames, majority-vote per charger slot, median queue count across samples |

All three accept: `file`, `total_chargers`, optional `charger_rois`
(JSON), optional `queue_rois` (JSON). `/analyze/frame` and
`/analyze/video` also take `station_id` and `persist` (bool, default
`true` — set `false` to test without writing to Supabase).

## Debugging bad results

If vehicle counts look right but slots or queue count are wrong,
don't guess — look at it directly:

```bash
curl -X POST http://localhost:8000/analyze/frame/debug \
  -F "file=@/path/to/frame.jpg" \
  -F "total_chargers=4" \
  --output debug.jpg
```

Open `debug.jpg`. Cyan boxes are detected vehicles (with confidence
score). Red/green boxes are charger ROIs (occupied/available). Amber
boxes are queue ROIs, labeled with the counted total.

**If the cyan boxes are on real vehicles but the colored ROI boxes
don't line up with the actual bays or waiting lane**, the ROIs are
wrong, not the detector. This is the single most common failure mode,
and it's almost always caused by relying on the auto-fallbacks — an
even vertical-column split has no idea where your bays actually are,
and a bottom-quarter band is an even rougher guess for where a queue
forms. Both only line up by coincidence on real footage. **Use
calibrated ROIs instead** — see below.

If instead the cyan boxes themselves are missing real vehicles or
firing on non-vehicles, that's a detection problem: try lowering
`CV_CONFIDENCE_THRESHOLD` (misses) or raising it (false positives), or
check the vehicle isn't heavily occluded/cropped at the frame edge.

## Calibrating real ROIs

Manually noting pixel coordinates in an image editor works but is
tedious and error-prone. Use the bundled calibration tool instead —
it's a static HTML file, no server needed:

```bash
open calibration_tool.html   # or just double-click it
```

1. Upload a still frame from the actual camera (a screenshot of the
   live feed, or `ffmpeg -i clip.mp4 -frames:v 1 frame.jpg` from a
   recording).
2. Pick **Charger** mode, click-and-drag a box around each charging
   bay, left to right.
3. Switch to **Queue** mode, draw one or more boxes over the area
   where cars actually line up waiting. It doesn't need to touch the
   charger boxes — a queue lane is often physically separate from the
   bays themselves.
4. Rename any box in the sidebar if you want clearer labels.
5. Click "Copy JSON" — it copies both `charger_rois` and `queue_rois`
   at once, ready to paste as the two form fields.

Re-run `/analyze/frame/debug` afterward to confirm both sets of boxes
now land on the real bays and queue lane before trusting
`/analyze/frame`'s numbers.

A production version would store these per-station in Supabase and
look them up automatically instead of passing them on every call —
straightforward follow-up, not done here to keep this phase focused
on the detection pipeline itself.

## Where results go

On a successful analysis (with `persist=true`), the service writes to:

- **`stations.live_available_chargers` / `live_predicted_wait_min` /
  `live_updated_at`** — the Next.js app's recommendation engine
  (`src/lib/recommendation/predictWait.ts`) prefers this over the
  simulated wait whenever it's less than 30 minutes old.
- **`occupancy_readings`** — an append-only log, for building a real
  historical average session duration later instead of the current
  fixed `AVG_SESSION_MIN` constant.

Run `supabase/migrations/003_live_occupancy.sql` before starting this
service, or the writes will fail (the read/analysis still works fine
without it — only `persist` fails).

## Wiring into the Next.js app

The operator dashboard (`/operator`) has a CCTV upload section per
station with `cctv_enabled = true`. It posts to
`src/app/api/stations/[id]/analyze`, which checks the operator owns
the station, then forwards the upload to this service. Set
`CV_SERVICE_URL` in the Next.js app's `.env.local` (defaults to
`http://localhost:8000` for local dev).

## Going from demo to production

- **Live RTSP feeds instead of uploads**: same `detect_vehicles` /
  `assign_to_rois` code path, called on a timer against frames pulled
  from an RTSP stream (`cv2.VideoCapture(rtsp_url)`) instead of an
  uploaded file — the detection logic doesn't change.
- **Fine-tuned model**: swap `CV_MODEL_PATH` for a model trained on
  actual charging-bay footage if the pretrained COCO classes ever
  misfire on your camera angle.
- **Real session-duration averages**: `occupancy_readings` is already
  being logged — once there's enough history, replace the fixed
  `AVG_SESSION_MIN` with a per-station rolling average from
  `charging_sessions`.