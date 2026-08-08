"""
CCTV occupancy microservice.

Run locally:
    uvicorn main:app --reload --port 8000

See README.md for setup (model download, env vars, calling it from the
operator dashboard).
"""

import io
import json
from dataclasses import asdict

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import occupancy
import supabase_client

app = FastAPI(title="EV Charging — CCTV Occupancy Service")

# Locked down to the Next.js dev/prod origins in production — wide open
# here since this only ever receives requests proxied through
# /api/stations/[id]/analyze on the Next.js side, never directly from
# a browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _read_image(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(400, "Could not decode image — is it a valid image file?")
    return frame


def _parse_rois(rois_json: str | None, kind: str) -> list[occupancy.ROI] | None:
    if not rois_json:
        return None
    try:
        raw = json.loads(rois_json)
    except json.JSONDecodeError:
        raise HTTPException(400, f"`{kind}_rois` must be valid JSON")

    try:
        return [
            occupancy.ROI(
                slot_label=r["slot_label"],
                x1=r["x1"],
                y1=r["y1"],
                x2=r["x2"],
                y2=r["y2"],
                kind=kind,
            )
            for r in raw
        ]
    except (KeyError, TypeError):
        raise HTTPException(
            400,
            f"Each entry in `{kind}_rois` needs slot_label, x1, y1, x2, y2 (pixel coordinates)",
        )


def _result_to_dict(result: occupancy.OccupancyResult) -> dict:
    return {
        "total_chargers": result.total_chargers,
        "occupied_count": result.occupied_count,
        "available_count": result.available_count,
        "queue_length": result.queue_length,
        "predicted_wait_min": result.predicted_wait_min,
        "slots": [asdict(s) for s in result.slots],
    }


@app.get("/health")
def health():
    return {"status": "ok", "supabase_configured": supabase_client.is_configured()}


@app.post("/analyze/frame")
async def analyze_frame(
    file: UploadFile = File(...),
    station_id: str = Form(...),
    total_chargers: int = Form(...),
    charger_rois: str | None = Form(None),
    queue_rois: str | None = Form(None),
    persist: bool = Form(True),
):
    """
    Analyzes a single image (a still frame, or a snapshot from a live
    feed).

    `charger_rois` is optional JSON — a list of
    {slot_label, x1, y1, x2, y2} pixel boxes, one per charging bay,
    calibrated for this camera (see calibration_tool.html). Without
    it, falls back to an even vertical-grid split (auto_grid_rois) —
    fine for a demo, not for production accuracy.

    `queue_rois` is optional JSON in the same shape, covering the
    waiting/queue area. Without it, falls back to a rough
    bottom-of-frame guess (auto_queue_roi) — even less reliable than
    the charger fallback, since queue layouts vary a lot more than a
    row of bays does. Calibrate this one especially.
    """
    data = await file.read()
    frame = _read_image(data)

    parsed_charger_rois = _parse_rois(charger_rois, "charger")
    parsed_queue_rois = _parse_rois(queue_rois, "queue")
    if parsed_queue_rois is None:
        h, w = frame.shape[:2]
        parsed_queue_rois = occupancy.auto_queue_roi(w, h)

    result = occupancy.analyze_frame(
        frame, total_chargers, parsed_charger_rois, parsed_queue_rois
    )

    write_error = None
    if persist:
        write_error = await supabase_client.write_occupancy_result(
            station_id=station_id,
            occupied_count=result.occupied_count,
            total_chargers=result.total_chargers,
            predicted_wait_min=result.predicted_wait_min,
            queue_length=result.queue_length,
        )

    response = _result_to_dict(result)
    response["station_id"] = station_id
    if write_error:
        response["write_warning"] = write_error
    return response


@app.post("/analyze/frame/debug")
async def analyze_frame_debug(
    file: UploadFile = File(...),
    total_chargers: int = Form(...),
    charger_rois: str | None = Form(None),
    queue_rois: str | None = Form(None),
):
    """
    Same detection + assignment as /analyze/frame, but returns an
    annotated JPEG instead of JSON — cyan boxes on detected vehicles,
    red/green boxes on charger ROIs (occupied/available), amber boxes
    on queue ROIs with the counted total. Use this to check whether
    ROI coordinates actually line up with the real charging bays and
    waiting area before trusting /analyze/frame's numbers. Doesn't
    persist anything to Supabase.
    """
    data = await file.read()
    frame = _read_image(data)
    h, w = frame.shape[:2]

    parsed_charger_rois = _parse_rois(charger_rois, "charger") or occupancy.auto_grid_rois(
        w, h, total_chargers
    )
    parsed_queue_rois = _parse_rois(queue_rois, "queue") or occupancy.auto_queue_roi(w, h)

    vehicles = occupancy.detect_vehicles(frame)
    slot_results = occupancy.assign_to_rois(vehicles, parsed_charger_rois)
    queue_length = occupancy.count_vehicles_in_regions(vehicles, parsed_queue_rois)

    annotated = occupancy.draw_debug_overlay(
        frame, vehicles, parsed_charger_rois, slot_results, parsed_queue_rois, queue_length
    )
    ok, buffer = cv2.imencode(".jpg", annotated)
    if not ok:
        raise HTTPException(500, "Failed to encode debug image")

    return StreamingResponse(io.BytesIO(buffer.tobytes()), media_type="image/jpeg")


@app.post("/analyze/video")
async def analyze_video(
    file: UploadFile = File(...),
    station_id: str = Form(...),
    total_chargers: int = Form(...),
    charger_rois: str | None = Form(None),
    queue_rois: str | None = Form(None),
    sample_every_n_frames: int = Form(15),
    max_samples: int = Form(20),
    persist: bool = Form(True),
):
    """
    Samples frames out of an uploaded video (pre-recorded CCTV clip is
    fine for a demo — a live RTSP feed is the same code path applied
    continuously, left for a production follow-up) and averages
    occupancy + queue count across them for a more stable reading than
    a single frame — one delivery truck double-parked in frame 1
    shouldn't flip a slot's status on its own.
    """
    data = await file.read()

    tmp_path = "/tmp/_cv_upload.mp4"
    with open(tmp_path, "wb") as f:
        f.write(data)

    cap = cv2.VideoCapture(tmp_path)
    if not cap.isOpened():
        raise HTTPException(400, "Could not open video — is it a valid video file?")

    frame_idx = 0
    samples_taken = 0
    parsed_charger_rois = None
    parsed_queue_rois = None
    occupied_tally: dict[str, int] = {}
    queue_counts: list[int] = []
    slot_labels: list[str] = []

    while samples_taken < max_samples:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_idx % sample_every_n_frames == 0:
            h, w = frame.shape[:2]
            if parsed_charger_rois is None:
                parsed_charger_rois = _parse_rois(
                    charger_rois, "charger"
                ) or occupancy.auto_grid_rois(w, h, total_chargers)
                parsed_queue_rois = _parse_rois(
                    queue_rois, "queue"
                ) or occupancy.auto_queue_roi(w, h)
                slot_labels = [r.slot_label for r in parsed_charger_rois]
                occupied_tally = {label: 0 for label in slot_labels}

            vehicles = occupancy.detect_vehicles(frame)
            slot_results = occupancy.assign_to_rois(vehicles, parsed_charger_rois)
            for s in slot_results:
                if s.occupied:
                    occupied_tally[s.slot_label] += 1
            queue_counts.append(
                occupancy.count_vehicles_in_regions(vehicles, parsed_queue_rois)
            )
            samples_taken += 1
        frame_idx += 1

    cap.release()

    if samples_taken == 0:
        raise HTTPException(400, "No frames could be read from the video")

    # A slot counts as "occupied" if it was occupied in the majority of
    # sampled frames — smooths over single-frame detection misses.
    final_slots = [
        occupancy.SlotResult(slot_label=label, occupied=(count / samples_taken) >= 0.5)
        for label, count in occupied_tally.items()
    ]
    occupied_count = sum(1 for s in final_slots if s.occupied)
    # Queue length: median across samples rather than mean — a queue
    # briefly spiking to double length for one frame (e.g. a car just
    # passing through, not actually joining) shouldn't skew the estimate
    # the way an outlier would skew a mean.
    queue_counts.sort()
    queue_length = queue_counts[len(queue_counts) // 2] if queue_counts else 0

    result = occupancy.OccupancyResult(
        total_chargers=len(final_slots),
        occupied_count=occupied_count,
        available_count=len(final_slots) - occupied_count,
        queue_length=queue_length,
        predicted_wait_min=occupancy.estimate_wait_minutes(
            occupied_count, len(final_slots), queue_length
        ),
        slots=final_slots,
    )

    write_error = None
    if persist:
        write_error = await supabase_client.write_occupancy_result(
            station_id=station_id,
            occupied_count=result.occupied_count,
            total_chargers=result.total_chargers,
            predicted_wait_min=result.predicted_wait_min,
            queue_length=result.queue_length,
        )

    response = _result_to_dict(result)
    response["station_id"] = station_id
    response["samples_analyzed"] = samples_taken
    if write_error:
        response["write_warning"] = write_error
    return response