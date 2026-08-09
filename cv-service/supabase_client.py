"""
Minimal Supabase REST (PostgREST) client for the CV service.

Uses the service_role key, never the anon key — this process runs
server-side only and needs to write to `stations` and
`occupancy_readings` regardless of RLS ownership policies. Never expose
SUPABASE_SERVICE_ROLE_KEY to a browser or client app.
"""

import os
from datetime import datetime, timezone
from typing import Optional

import httpx

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers() -> dict:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


async def write_occupancy_result(
    station_id: str,
    occupied_count: int,
    total_chargers: int,
    predicted_wait_min: int,
    queue_length: int = 0,
    source: str = "cctv",
) -> Optional[str]:
    """
    Writes the latest occupancy snapshot to `stations` (so the app's
    next search picks it up immediately) and appends a row to
    `occupancy_readings` (for future historical-average work).

    Best-effort: returns an error string on failure instead of raising,
    so a Supabase hiccup never breaks the /analyze response the
    operator is waiting on.
    """
    if not is_configured():
        return "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping write"

    now = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            station_resp = await client.patch(
                f"{SUPABASE_URL}/rest/v1/stations?id=eq.{station_id}",
                headers=_headers(),
                json={
                    "live_available_chargers": total_chargers - occupied_count,
                    "live_predicted_wait_min": predicted_wait_min,
                    "live_queue_length": queue_length,
                    "live_updated_at": now,
                },
            )
            station_resp.raise_for_status()

            reading_resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/occupancy_readings",
                headers=_headers(),
                json={
                    "station_id": station_id,
                    "occupied_count": occupied_count,
                    "total_chargers": total_chargers,
                    "predicted_wait_min": predicted_wait_min,
                    "queue_length": queue_length,
                    "source": source,
                },
            )
            reading_resp.raise_for_status()
        except httpx.HTTPError as exc:
            return f"Supabase write failed: {exc}"

    return None