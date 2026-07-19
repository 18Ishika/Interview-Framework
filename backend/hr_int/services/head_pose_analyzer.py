"""
Head pose estimation (yaw / pitch / roll) using OpenCV's solvePnP against a
generic 3D face model.

Why this matters on top of gaze alone:
    The gaze analyzer can't tell the difference between "eyes drifted while
    head stayed put" and "candidate physically turned away". Both look
    similar in raw iris-ratio terms but mean very different things for an
    interview read: a turned head is a much stronger disengagement signal
    than a quick eye flick. Head pose also gives a cheap "fidgeting /
    restlessness" signal via how much yaw/pitch/roll vary over time,
    independent of whether any single frame crosses the gaze threshold.
"""

import cv2
import numpy as np

from .landmarks import HEAD_POSE_LANDMARKS

# Generic 3D face model points (arbitrary units, right-handed, nose tip at origin).
# Order MUST match _LANDMARK_ORDER below.
_MODEL_POINTS = np.array([
    (0.0, 0.0, 0.0),          # nose_tip
    (0.0, -330.0, -65.0),     # chin
    (-225.0, 170.0, -135.0),  # left_eye_outer
    (225.0, 170.0, -135.0),   # right_eye_outer
    (-150.0, -150.0, -125.0), # mouth_left
    (150.0, -150.0, -125.0),  # mouth_right
], dtype=np.float64)

_LANDMARK_ORDER = ["nose_tip", "chin", "left_eye_outer", "right_eye_outer", "mouth_left", "mouth_right"]

YAW_AWAY_THRESHOLD_DEG = 25.0
PITCH_AWAY_THRESHOLD_DEG = 20.0


def estimate_head_pose(face_landmarks, width, height):
    """Returns (yaw_deg, pitch_deg, roll_deg) or None if estimation fails."""
    try:
        image_points = np.array([
            (face_landmarks[HEAD_POSE_LANDMARKS[name]].x * width,
             face_landmarks[HEAD_POSE_LANDMARKS[name]].y * height)
            for name in _LANDMARK_ORDER
        ], dtype=np.float64)

        focal_length = width
        center = (width / 2.0, height / 2.0)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1],
        ], dtype=np.float64)
        dist_coeffs = np.zeros((4, 1))  # assume no lens distortion

        success, rotation_vec, _ = cv2.solvePnP(
            _MODEL_POINTS, image_points, camera_matrix, dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE,
        )
        if not success:
            return None

        rotation_mat, _ = cv2.Rodrigues(rotation_vec)
        sy = np.sqrt(rotation_mat[0, 0] ** 2 + rotation_mat[1, 0] ** 2)
        singular = sy < 1e-6

        if not singular:
            pitch = np.arctan2(rotation_mat[2, 1], rotation_mat[2, 2])
            yaw = np.arctan2(-rotation_mat[2, 0], sy)
            roll = np.arctan2(rotation_mat[1, 0], rotation_mat[0, 0])
        else:
            pitch = np.arctan2(-rotation_mat[1, 2], rotation_mat[1, 1])
            yaw = np.arctan2(-rotation_mat[2, 0], sy)
            roll = 0

        return np.degrees(yaw), np.degrees(pitch), np.degrees(roll)
    except Exception:
        return None


class HeadPoseAnalyzer:
    def __init__(self):
        self._frames_with_pose = 0
        self._facing_frames = 0
        self._yaw_samples = []
        self._pitch_samples = []
        self._turned_away_frames = 0

    def process_frame(self, face_landmarks, width, height):
        if face_landmarks is None:
            return

        pose = estimate_head_pose(face_landmarks, width, height)
        if pose is None:
            return

        yaw, pitch, _roll = pose
        self._frames_with_pose += 1
        self._yaw_samples.append(yaw)
        self._pitch_samples.append(pitch)

        facing_camera = abs(yaw) <= YAW_AWAY_THRESHOLD_DEG and abs(pitch) <= PITCH_AWAY_THRESHOLD_DEG
        if facing_camera:
            self._facing_frames += 1
        else:
            self._turned_away_frames += 1

    def finalize(self):
        if self._frames_with_pose == 0:
            return {
                "facing_camera_pct": None,
                "steadiness": None,
                "feedback": ["Head pose could not be reliably estimated for this video."],
            }

        facing_pct = (self._facing_frames / self._frames_with_pose) * 100.0
        # Steadiness = inverse of how much yaw/pitch wander frame to frame.
        # High variance -> fidgety/restless head movement.
        yaw_std = float(np.std(self._yaw_samples))
        pitch_std = float(np.std(self._pitch_samples))
        steadiness_score = max(0.0, 100.0 - (yaw_std + pitch_std) * 2.0)

        feedback = []
        if facing_pct >= 85:
            feedback.append("You kept your head oriented toward the camera consistently.")
        elif facing_pct >= 60:
            feedback.append("Your head turned away from the camera at times during the interview.")
        else:
            feedback.append("Your head was frequently turned away from the camera, which reads as disengagement.")

        if steadiness_score < 60:
            feedback.append("Your head movement was quite restless, which can come across as fidgeting or nervousness.")

        return {
            "facing_camera_pct": round(facing_pct, 1),
            "steadiness_score": round(steadiness_score, 1),
            "feedback": feedback,
        }