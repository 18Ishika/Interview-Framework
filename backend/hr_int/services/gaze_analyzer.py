import numpy as np

from .landmarks import (
    LEFT_IRIS, LEFT_EYE_INNER, LEFT_EYE_OUTER, LEFT_EYE_TOP, LEFT_EYE_BOTTOM,
    RIGHT_IRIS, RIGHT_EYE_INNER, RIGHT_EYE_OUTER, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM,
)

GAZE_HORIZONTAL_LIMIT = 0.14   # allowed deviation from center (0.5) before "looking away"
GAZE_VERTICAL_LIMIT = 0.18
MIN_BREAK_SECONDS_TO_LOG = 1.0  # ignore sub-second flickers as noise, not real breaks


def _pt(landmarks, idx, width, height):
    return np.array([landmarks[idx].x * width, landmarks[idx].y * height])


def _eye_gaze_ratio(landmarks, iris, inner, outer, top, bottom, width, height):
    iris_pt = _pt(landmarks, iris, width, height)
    inner_pt = _pt(landmarks, inner, width, height)
    outer_pt = _pt(landmarks, outer, width, height)
    top_pt = _pt(landmarks, top, width, height)
    bottom_pt = _pt(landmarks, bottom, width, height)

    eye_width = np.linalg.norm(outer_pt - inner_pt) + 1e-6
    eye_height = np.linalg.norm(top_pt - bottom_pt) + 1e-6

    horiz_ratio = np.linalg.norm(iris_pt - inner_pt) / eye_width
    vert_ratio = (iris_pt[1] - top_pt[1]) / eye_height
    return horiz_ratio, vert_ratio


def evaluate_gaze(face_landmarks, width, height):
    """Returns (is_engaged: bool, horiz_deviation: float, vert_deviation: float)."""
    try:
        l_horiz, l_vert = _eye_gaze_ratio(
            face_landmarks, LEFT_IRIS, LEFT_EYE_INNER, LEFT_EYE_OUTER, LEFT_EYE_TOP, LEFT_EYE_BOTTOM, width, height
        )
        r_horiz, r_vert = _eye_gaze_ratio(
            face_landmarks, RIGHT_IRIS, RIGHT_EYE_INNER, RIGHT_EYE_OUTER, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, width, height
        )
        avg_horiz = (l_horiz + r_horiz) / 2.0
        avg_vert = (l_vert + r_vert) / 2.0

        horiz_dev = abs(avg_horiz - 0.5)
        vert_dev = abs(avg_vert - 0.5)

        is_engaged = horiz_dev <= GAZE_HORIZONTAL_LIMIT and vert_dev <= GAZE_VERTICAL_LIMIT
        return is_engaged, horiz_dev, vert_dev
    except Exception:
        return True, 0.0, 0.0  # fail open: a mid-frame landmark glitch shouldn't count as a break


class GazeAnalyzer:
    def __init__(self):
        self._frames_with_face = 0
        self._engaged_frames = 0

        self._break_active = False
        self._break_start = None
        self._break_frames = 0
        self.breaks = []  # list of {"start_sec", "end_sec", "duration_sec"}

    def process_frame(self, face_landmarks, width, height, time_sec):
        if face_landmarks is None:
            self._close_break_if_open(time_sec)
            return

        self._frames_with_face += 1
        is_engaged, _, _ = evaluate_gaze(face_landmarks, width, height)

        if is_engaged:
            self._engaged_frames += 1
            self._close_break_if_open(time_sec)
        else:
            if not self._break_active:
                self._break_active = True
                self._break_start = time_sec
                self._break_frames = 0
            self._break_frames += 1

    def _close_break_if_open(self, time_sec):
        if self._break_active:
            duration = time_sec - self._break_start
            if duration >= MIN_BREAK_SECONDS_TO_LOG:
                self.breaks.append({
                    "start_sec": round(self._break_start, 2),
                    "end_sec": round(time_sec, 2),
                    "duration_sec": round(duration, 2),
                })
            self._break_active = False
            self._break_start = None
            self._break_frames = 0

    def finalize(self, final_time_sec):
        self._close_break_if_open(final_time_sec)

        if self._frames_with_face == 0:
            return {
                "score": None,
                "eye_contact_pct": None,
                "longest_break_seconds": 0.0,
                "break_count": 0,
                "breaks": [],
                "feedback": ["Eye contact could not be reliably measured (face not visible enough in frame)."],
            }

        score = (self._engaged_frames / self._frames_with_face) * 100.0
        longest_break = max((b["duration_sec"] for b in self.breaks), default=0.0)
        feedback = self._feedback(score, longest_break, len(self.breaks))

        return {
            "score": round(score, 1),
            "eye_contact_pct": round(score, 1),
            "longest_break_seconds": round(longest_break, 1),
            "break_count": len(self.breaks),
            "breaks": self.breaks,
            "feedback": feedback,
        }

    @staticmethod
    def _feedback(score, longest_break, break_count):
        notes = []
        if score >= 85:
            notes.append("You maintained strong, consistent eye contact throughout.")
        elif score >= 65:
            notes.append("Your eye contact was reasonably good but broke away more than ideal.")
        else:
            notes.append("You looked away from the camera frequently. Practicing holding the camera's gaze will help.")

        if longest_break >= 4:
            notes.append(f"There was one notably long break in eye contact (about {longest_break:.0f} seconds).")
        if break_count >= 8:
            notes.append("Eye contact broke frequently in short bursts, which can read as distracted or unsure.")
        return notes