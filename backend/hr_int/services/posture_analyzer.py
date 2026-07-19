import math

SHOULDER_TILT_LIMIT_DEG = 8.0
CALIBRATION_SECONDS = 2.0
SLOUCH_RATIO_DROP_FRACTION = 0.18  # flag if posture_ratio drops >18% below the candidate's own baseline


class _StreakTracker:
    """Applies a grace window so a single bad frame doesn't spike the score,
    but a genuinely sustained bad posture still gets flagged as one event."""

    def __init__(self, sustained_frames, recovery_step=2):
        self.sustained_frames = sustained_frames
        self.recovery_step = recovery_step
        self._bad_streak = 0
        self._event_open = False
        self._event_start = None

    def update(self, is_bad_instant, time_sec):
        """Returns (currently_bad: bool, closed_event: dict|None)."""
        closed_event = None
        if is_bad_instant:
            self._bad_streak += 1
        else:
            self._bad_streak = max(0, self._bad_streak - self.recovery_step)

        currently_bad = self._bad_streak >= self.sustained_frames

        if currently_bad and not self._event_open:
            self._event_open = True
            self._event_start = time_sec
        elif not currently_bad and self._event_open:
            closed_event = {
                "start_sec": round(self._event_start, 2),
                "end_sec": round(time_sec, 2),
                "duration_sec": round(time_sec - self._event_start, 2),
            }
            self._event_open = False
            self._event_start = None

        return currently_bad, closed_event

    def close(self, final_time_sec):
        if self._event_open:
            return {
                "start_sec": round(self._event_start, 2),
                "end_sec": round(final_time_sec, 2),
                "duration_sec": round(final_time_sec - self._event_start, 2),
            }
        return None


class PostureAnalyzer:
    def __init__(self, sampled_fps, mp_pose):
        self.mp_pose = mp_pose
        self.calibration_frames_needed = max(1, int(CALIBRATION_SECONDS * sampled_fps))
        self._calibration_ratios = []
        self.baseline_ratio = None

        sustained_frames = max(1, int(1.0 * sampled_fps))  # ~1 second sustained to count as an "issue"
        self._tilt_tracker = _StreakTracker(sustained_frames)
        self._slouch_tracker = _StreakTracker(sustained_frames)

        self._frames_with_pose = 0
        self._good_frames = 0

        self.tilt_events = []
        self.slouch_events = []

    def process_frame(self, pose_landmarks, width, height, time_sec):
        if pose_landmarks is None:
            return

        lm = pose_landmarks.landmark
        P = self.mp_pose.PoseLandmark
        l_shoulder = (lm[P.LEFT_SHOULDER.value].x * width, lm[P.LEFT_SHOULDER.value].y * height)
        r_shoulder = (lm[P.RIGHT_SHOULDER.value].x * width, lm[P.RIGHT_SHOULDER.value].y * height)
        nose = (lm[P.NOSE.value].x * width, lm[P.NOSE.value].y * height)

        # Shoulder tilt
        dy = abs(l_shoulder[1] - r_shoulder[1])
        dx = abs(l_shoulder[0] - r_shoulder[0]) + 1e-6
        shoulder_tilt = math.degrees(math.atan2(dy, dx))

        # Slouch / forward-head ratio
        shoulder_baseline_y = (l_shoulder[1] + r_shoulder[1]) / 2.0
        shoulder_width = math.hypot(l_shoulder[0] - r_shoulder[0], l_shoulder[1] - r_shoulder[1]) + 1e-6
        posture_ratio = (shoulder_baseline_y - nose[1]) / shoulder_width

        if self.baseline_ratio is None:
            self._calibration_ratios.append(posture_ratio)
            if len(self._calibration_ratios) >= self.calibration_frames_needed:
                self._calibration_ratios.sort()
                mid = len(self._calibration_ratios) // 2
                self.baseline_ratio = self._calibration_ratios[mid]  # median, robust to one bad frame
            return  # skip scoring during calibration

        self._frames_with_pose += 1

        slouch_threshold = self.baseline_ratio * (1.0 - SLOUCH_RATIO_DROP_FRACTION)
        is_tilt_bad = shoulder_tilt > SHOULDER_TILT_LIMIT_DEG
        is_slouch_bad = posture_ratio < slouch_threshold

        tilt_bad_sustained, tilt_closed = self._tilt_tracker.update(is_tilt_bad, time_sec)
        slouch_bad_sustained, slouch_closed = self._slouch_tracker.update(is_slouch_bad, time_sec)

        if tilt_closed:
            self.tilt_events.append(tilt_closed)
        if slouch_closed:
            self.slouch_events.append(slouch_closed)

        if not tilt_bad_sustained and not slouch_bad_sustained:
            self._good_frames += 1

    def finalize(self, final_time_sec):
        final_tilt = self._tilt_tracker.close(final_time_sec)
        if final_tilt:
            self.tilt_events.append(final_tilt)
        final_slouch = self._slouch_tracker.close(final_time_sec)
        if final_slouch:
            self.slouch_events.append(final_slouch)

        if self._frames_with_pose == 0:
            return {
                "score": None,
                "good_posture_pct": None,
                "calibrated": self.baseline_ratio is not None,
                "tilt_events": [],
                "slouch_events": [],
                "feedback": ["Posture could not be reliably measured (body not visible enough in frame)."],
            }

        score = (self._good_frames / self._frames_with_pose) * 100.0
        feedback = self._feedback(score, self.tilt_events, self.slouch_events)

        return {
            "score": round(score, 1),
            "good_posture_pct": round(score, 1),
            "calibrated": self.baseline_ratio is not None,
            "tilt_events": self.tilt_events,
            "slouch_events": self.slouch_events,
            "feedback": feedback,
        }

    @staticmethod
    def _feedback(score, tilt_events, slouch_events):
        notes = []
        if score >= 85:
            notes.append("Your posture was upright and steady for almost the entire interview.")
        elif score >= 65:
            notes.append("Your posture was generally good with some noticeable lapses.")
        else:
            notes.append("Your posture slipped frequently. Sitting further back with shoulders relaxed and squared to the camera will help.")

        if len(slouch_events) >= 3:
            total = sum(e["duration_sec"] for e in slouch_events)
            notes.append(f"You slouched forward on {len(slouch_events)} separate occasions, totaling about {total:.0f} seconds.")
        if len(tilt_events) >= 3:
            notes.append("You leaned to one side repeatedly, which can look less composed on camera.")
        return notes