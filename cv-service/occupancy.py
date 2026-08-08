"""
Core CCTV -> occupancy pipeline.

Pipeline: CCTV frame -> vehicle detection (YOLOv8) -> ROI assignment
(which charger slot, if any, does each vehicle occupy) -> occupancy
count -> predicted wait time.

Kept deliberately simple per the doc's own guidance: for a hackathon,
a pretrained COCO model and a straightforward queueing estimate is
enough. Swap in a fine-tuned model or a real historical-average
session duration later without changing the shape of the output.
"""

from dataclasses import dataclass
from typing import Optional
import os

import numpy as np

# COCO class ids for vehicle-like classes: car, motorcycle, bus, truck.
# (0=person, 1=bicycle are deliberately excluded.)
VEHICLE_CLASS_IDS = {2, 3, 5, 7}

CONFIDENCE_THRESHOLD = float(os.environ.get("CV_CONFIDENCE_THRESHOLD", 0.35))

# Average charging session length, in minutes. Used only when a
# station is at full occupancy, to estimate how long until the next
# slot frees up. Replace with a real per-station historical average
# (see occupancy_readings table) once there's enough session data.
AVG_SESSION_MIN = int(os.environ.get("CV_AVG_SESSION_MIN", 48))


@dataclass
class BBox:
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_id: int

    @property
    def center(self) -> tuple[float, float]:
        return ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)


@dataclass
class ROI:
    """A region of interest in the frame — either a single charger
    bay (kind='charger', tracked by slot_label as occupied/available)
    or part of a waiting/queue area (kind='queue', just contributes to
    a total count — no per-slot identity, since queue positions aren't
    fixed the way charger bays are)."""

    slot_label: str
    x1: float
    y1: float
    x2: float
    y2: float
    kind: str = "charger"  # 'charger' | 'queue'

    def contains_point(self, point: tuple[float, float]) -> bool:
        x, y = point
        return self.x1 <= x <= self.x2 and self.y1 <= y <= self.y2


@dataclass
class SlotResult:
    slot_label: str
    occupied: bool


@dataclass
class OccupancyResult:
    total_chargers: int
    occupied_count: int
    available_count: int
    queue_length: int
    predicted_wait_min: int
    slots: list[SlotResult]


_model = None


def get_model():
    """Lazy-load the YOLO model — avoids the ~1-2s load cost on every
    import, and means a pure-logic unit test never needs the weights
    downloaded at all."""
    global _model
    if _model is None:
        from ultralytics import YOLO

        _model = YOLO(os.environ.get("CV_MODEL_PATH", "yolov8n.pt"))
    return _model


def detect_vehicles(frame: np.ndarray) -> list[BBox]:
    """Runs YOLO on a single frame, returns vehicle-class detections."""
    model = get_model()
    results = model.predict(frame, verbose=False, conf=CONFIDENCE_THRESHOLD)

    boxes: list[BBox] = []
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            if class_id not in VEHICLE_CLASS_IDS:
                continue
            x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
            boxes.append(
                BBox(
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    confidence=float(box.conf[0]),
                    class_id=class_id,
                )
            )
    return boxes


def auto_grid_rois(
    frame_width: int, frame_height: int, n_slots: int, band: tuple[float, float] = (0.15, 0.95)
) -> list[ROI]:
    """
    Fallback ROI generator for demos without a calibrated camera: splits
    the frame into `n_slots` equal vertical columns. Works reasonably
    well for a straight-on shot of a row of charging bays; a real
    deployment should calibrate actual ROI boxes per camera instead
    (see calibration_tool.html).

    `band` restricts the ROI to the vertical slice of the frame most
    likely to contain vehicles (skips sky/ceiling and the very bottom
    edge) — (0.15, 0.95) means "skip top 15%, use down to 95% height".
    """
    col_width = frame_width / n_slots
    y1 = frame_height * band[0]
    y2 = frame_height * band[1]
    return [
        ROI(
            slot_label=f"Charger {i + 1:02d}",
            x1=i * col_width,
            y1=y1,
            x2=(i + 1) * col_width,
            y2=y2,
            kind="charger",
        )
        for i in range(n_slots)
    ]


def auto_queue_roi(frame_width: int, frame_height: int) -> list[ROI]:
    """
    Fallback queue region for demos: a single band across the bottom
    quarter of the frame, on the theory that a waiting lane is usually
    the part of the scene closest to the camera. This is a much
    rougher guess than auto_grid_rois and will misfire on most real
    camera layouts (e.g. a queue lane running along one side rather
    than across the bottom) — calibrate a real queue ROI with
    calibration_tool.html for anything beyond a rough demo.
    """
    return [
        ROI(
            slot_label="Queue",
            x1=0,
            y1=frame_height * 0.75,
            x2=frame_width,
            y2=frame_height * 0.98,
            kind="queue",
        )
    ]


def count_vehicles_in_regions(vehicles: list[BBox], rois: list[ROI]) -> int:
    """Counts each vehicle once if its center falls inside ANY of the
    given ROIs — dedupes so a vehicle spanning two overlapping queue
    boxes isn't double-counted."""
    count = 0
    for v in vehicles:
        if any(roi.contains_point(v.center) for roi in rois):
            count += 1
    return count


def assign_to_rois(vehicles: list[BBox], rois: list[ROI]) -> list[SlotResult]:
    """Marks each charger ROI occupied if any detected vehicle's center
    point falls inside it. Center-point containment (not IoU) is
    deliberate — it's robust to a vehicle box extending slightly past
    its bay into a neighboring one, which is common at oblique camera
    angles."""
    results = []
    for roi in rois:
        occupied = any(roi.contains_point(v.center) for v in vehicles)
        results.append(SlotResult(slot_label=roi.slot_label, occupied=occupied))
    return results


def estimate_wait_minutes(
    occupied_count: int, total_chargers: int, queue_length: int = 0
) -> int:
    """
    If any charger slot is free, the wait is 0 — a driver can plug in
    immediately, regardless of how many cars are in a queue area (that
    queue is either for something else, or about to move once the
    free slot is taken — either way, 0 is the right answer for a
    driver deciding whether to route here now).

    Once every slot is occupied, a new arrival queues behind whoever
    is already waiting. Modeled as: the driver needs (queue_length + 1)
    chargers to free up before their turn, and chargers free up at a
    combined rate of total_chargers per AVG_SESSION_MIN minutes — a
    simple M/M/c-style approximation, not a queueing guarantee.

    queue_length=0 reduces to the original formula
    (AVG_SESSION_MIN / total_chargers), so this is a strict
    generalization of the Phase 4 behavior, not a breaking change to
    it.
    """
    if occupied_count < total_chargers:
        return 0
    if total_chargers <= 0:
        return AVG_SESSION_MIN
    positions_ahead = queue_length + 1
    return round(positions_ahead * AVG_SESSION_MIN / total_chargers)


def draw_debug_overlay(
    frame: np.ndarray,
    vehicles: list[BBox],
    charger_rois: list[ROI],
    slot_results: list[SlotResult],
    queue_rois: Optional[list[ROI]] = None,
    queue_length: int = 0,
) -> np.ndarray:
    """
    Draws detected vehicle boxes (cyan), charger ROI boxes (red =
    occupied, green = available), and queue ROI boxes (amber, with the
    counted total) on the frame. Returns a new annotated frame —
    doesn't mutate the input.

    This is the fastest way to diagnose "detection count is right but
    slot/queue assignment is wrong": if the cyan boxes land on real
    vehicles but the colored ROI rectangles don't line up with the
    actual bays or waiting lane in the image, the ROIs (not the
    detector) are the problem — most commonly because an auto-fallback
    was used on a frame where the real layout doesn't match the guess.
    """
    import cv2

    out = frame.copy()

    for v in vehicles:
        cv2.rectangle(
            out, (int(v.x1), int(v.y1)), (int(v.x2), int(v.y2)), (255, 255, 0), 2
        )
        cv2.putText(
            out,
            f"{v.confidence:.2f}",
            (int(v.x1), max(int(v.y1) - 8, 12)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 0),
            1,
        )

    results_by_label = {s.slot_label: s.occupied for s in slot_results}
    for roi in charger_rois:
        occupied = results_by_label.get(roi.slot_label, False)
        color = (0, 0, 255) if occupied else (0, 200, 0)  # BGR: red / green
        cv2.rectangle(
            out, (int(roi.x1), int(roi.y1)), (int(roi.x2), int(roi.y2)), color, 2
        )
        cv2.putText(
            out,
            roi.slot_label,
            (int(roi.x1) + 4, int(roi.y1) + 18),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2,
        )

    if queue_rois:
        amber = (0, 165, 255)  # BGR
        for roi in queue_rois:
            cv2.rectangle(
                out, (int(roi.x1), int(roi.y1)), (int(roi.x2), int(roi.y2)), amber, 2
            )
        # Label once, on the first queue box, rather than repeating the
        # same count on every box in case there are several.
        first = queue_rois[0]
        cv2.putText(
            out,
            f"Queue: {queue_length}",
            (int(first.x1) + 4, int(first.y1) + 18),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            amber,
            2,
        )

    return out


def analyze_frame(
    frame: np.ndarray,
    total_chargers: int,
    charger_rois: Optional[list[ROI]] = None,
    queue_rois: Optional[list[ROI]] = None,
) -> OccupancyResult:
    """End-to-end: detect vehicles, assign to charger slots, count the
    queue, estimate wait. `queue_rois` is optional — omit it (and pass
    nothing) to get the old queue-blind behavior (queue_length=0,
    wait based purely on full/not-full)."""
    height, width = frame.shape[:2]
    if charger_rois is None:
        charger_rois = auto_grid_rois(width, height, total_chargers)

    vehicles = detect_vehicles(frame)
    slot_results = assign_to_rois(vehicles, charger_rois)

    occupied_count = sum(1 for s in slot_results if s.occupied)
    available_count = len(slot_results) - occupied_count
    queue_length = count_vehicles_in_regions(vehicles, queue_rois) if queue_rois else 0
    predicted_wait = estimate_wait_minutes(occupied_count, len(slot_results), queue_length)

    return OccupancyResult(
        total_chargers=len(slot_results),
        occupied_count=occupied_count,
        available_count=available_count,
        queue_length=queue_length,
        predicted_wait_min=predicted_wait,
        slots=slot_results,
    )