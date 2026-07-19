import numpy as np

from .landmarks import LEFT_EYE_EAR_POINTS, RIGHT_EYE_EAR_POINTS


def _euclidean(p1, p2):
    return np.linalg.norm(np.array(p1) - np.array(p2))


def _eye_aspect_ratio(landmarks, indices, width, height):
    pts = [(landmarks[i].x * width, landmarks[i].y * height) for i in indices]
    outer, top1, top2, inner, bottom1, bottom2 = pts
    vertical = _euclidean(top1, bottom1) + _euclidean(top2, bottom2)
    horizontal = _euclidean(outer, inner) + 1e-6
    return vertical / (2.0 * horizontal)


class BlinkAnalyzer:

    MIN_BLINK_FRAMES = 1          # eyes must be "closed" for at least this many sampled frames
    MAX_BLINK_FRAMES = 8          # longer than this is treated as eyes-closed/looking down, not a blink
    CALIBRATION_SECONDS = 2.0
    CLOSED_THRESHOLD_RATIO = 0.78  # closed if EAR drops below 78% of the calibrated open-eye EAR

    def __init__(self, sampled_fps):
        self.sampled_fps = sampled_fps
        self.calibration_frames_needed = max(1, int(self.CALIBRATION_SECONDS * sampled_fps))

        self._calibration_values = []
        self.open_ear_baseline = None
        self.closed_threshold = None

        self._is_closed = False
        self._closed_frame_count = 0

        self.blink_count = 0
        self.blink_events = []  # list of {"time_sec": float}
        self._frames_seen = 0
        self._frames_with_face = 0

    def process_frame(self, face_landmarks, width, height, time_sec):
        self._frames_seen += 1

        if face_landmarks is None:
            # No face this frame: don't let a dropout masquerade as a blink.
            self._is_closed = False
            self._closed_frame_count = 0
            return

        self._frames_with_face += 1
        left_ear = _eye_aspect_ratio(face_landmarks, LEFT_EYE_EAR_POINTS, width, height)
        right_ear = _eye_aspect_ratio(face_landmarks, RIGHT_EYE_EAR_POINTS, width, height)
        ear = (left_ear + right_ear) / 2.0

        if self.open_ear_baseline is None:
            self._calibration_values.append(ear)
            if len(self._calibration_values) >= self.calibration_frames_needed:
                # Use a high percentile rather than the max to stay robust to one bad frame.
                self.open_ear_baseline = float(np.percentile(self._calibration_values, 90))
                self.closed_threshold = self.open_ear_baseline * self.CLOSED_THRESHOLD_RATIO
            return  # don't evaluate blinks until calibrated

        is_closed_this_frame = ear < self.closed_threshold

        if is_closed_this_frame:
            self._closed_frame_count += 1
            self._is_closed = True
        else:
            if self._is_closed and self.MIN_BLINK_FRAMES <= self._closed_frame_count <= self.MAX_BLINK_FRAMES:
                self.blink_count += 1
                self.blink_events.append({"time_sec": round(time_sec, 2)})
            self._is_closed = False
            self._closed_frame_count = 0

    def finalize(self, total_duration_sec):
        if total_duration_sec <= 0 or self.blink_count == 0:
            blink_rate_per_min = 0.0
        else:
            blink_rate_per_min = self.blink_count / (total_duration_sec / 60.0)

        assessment, feedback = self._assess(blink_rate_per_min)

        return {
            "blink_count": self.blink_count,
            "blink_rate_per_min": round(blink_rate_per_min, 1),
            "assessment": assessment,
            "feedback": feedback,
            "calibrated": self.open_ear_baseline is not None,
            "events": self.blink_events,
        }

    @staticmethod
    def _assess(rate_per_min):
        if rate_per_min == 0.0:
            return "undetected", "Blink rate could not be reliably measured (face not visible enough)."
        if rate_per_min < 8:
            return "low", "Your blink rate was unusually low, which can sometimes read as a fixed or tense stare."
        if rate_per_min <= 25:
            return "normal", "Your blink rate stayed in a normal, relaxed range throughout."
        if rate_per_min <= 35:
            return "elevated", "Your blink rate was somewhat elevated, which can be a sign of nervousness."
        return "high", "Your blink rate was quite high, which often correlates with stress or discomfort. Consider practicing to build ease in front of the camera."