import os

import cv2
import mediapipe as mp

from .blink_analyzer import BlinkAnalyzer
from .gaze_analyzer import GazeAnalyzer
from .head_pose_analyzer import HeadPoseAnalyzer
from .posture_analyzer import PostureAnalyzer

TARGET_SAMPLED_FPS = 10


class VisualBehaviorService:
    def __init__(self, video_path, output_dir=None, annotate=True):
        self.video_path = video_path
        self.annotate = annotate
        self.output_dir = output_dir or os.path.dirname(video_path) or "."
        self.annotated_video_path = os.path.join(
            self.output_dir, f"{os.path.splitext(os.path.basename(video_path))[0]}_annotated.mp4"
        )

        self.mp_pose = mp.solutions.pose
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils

    def run(self):
        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            raise FileNotFoundError(f"Could not open video: {self.video_path}")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        source_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        frame_stride = max(1, round(source_fps / TARGET_SAMPLED_FPS))
        sampled_fps = source_fps / frame_stride

        writer = None
        if self.annotate:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(self.annotated_video_path, fourcc, sampled_fps, (width, height))

        posture = PostureAnalyzer(sampled_fps, self.mp_pose)
        gaze = GazeAnalyzer()
        blink = BlinkAnalyzer(sampled_fps)
        head_pose = HeadPoseAnalyzer()

        last_time_sec = 0.0
        analyzed_frame_index = 0

        with self.mp_pose.Pose(min_detection_confidence=0.7, min_tracking_confidence=0.7) as pose_model, \
             self.mp_face_mesh.FaceMesh(refine_landmarks=True, min_detection_confidence=0.7,
                                         min_tracking_confidence=0.7) as face_model:

            frame_index = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_index % frame_stride != 0:
                    frame_index += 1
                    continue

                time_sec = analyzed_frame_index / sampled_fps
                last_time_sec = time_sec

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pose_results = pose_model.process(rgb)
                face_results = face_model.process(rgb)

                pose_landmarks = pose_results.pose_landmarks
                face_landmarks = (
                    face_results.multi_face_landmarks[0].landmark
                    if face_results.multi_face_landmarks else None
                )

                posture.process_frame(pose_landmarks, width, height, time_sec)
                gaze.process_frame(face_landmarks, width, height, time_sec)
                blink.process_frame(face_landmarks, width, height, time_sec)
                head_pose.process_frame(face_landmarks, width, height)

                if writer is not None:
                    self._annotate_frame(frame, pose_results, posture, gaze)
                    writer.write(frame)

                analyzed_frame_index += 1
                frame_index += 1

        cap.release()
        if writer is not None:
            writer.release()

        posture_report = posture.finalize(last_time_sec)
        gaze_report = gaze.finalize(last_time_sec)
        blink_report = blink.finalize(last_time_sec)
        head_pose_report = head_pose.finalize()

        overall = self._compute_overall_score(posture_report, gaze_report, blink_report, head_pose_report)

        return {
            "duration_seconds": round(last_time_sec, 1),
            "analyzed_frames": analyzed_frame_index,
            "sampled_fps": round(sampled_fps, 1),
            "posture": posture_report,
            "gaze": gaze_report,
            "blink": blink_report,
            "head_pose": head_pose_report,
            "overall_visual_confidence_score": overall,
            "annotated_video_path": self.annotated_video_path if self.annotate else None,
        }

    def _annotate_frame(self, frame, pose_results, posture, gaze):
        if pose_results.pose_landmarks:
            self.mp_drawing.draw_landmarks(frame, pose_results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)

        posture_ok = not posture._tilt_tracker._event_open and not posture._slouch_tracker._event_open
        gaze_ok = not gaze._break_active

        cv2.putText(frame, f"Posture: {'GOOD' if posture_ok else 'ADJUST'}", (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0) if posture_ok else (0, 0, 255), 2)
        cv2.putText(frame, f"Gaze: {'ENGAGED' if gaze_ok else 'AWAY'}", (30, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0) if gaze_ok else (0, 0, 255), 2)

    @staticmethod
    def _compute_overall_score(posture_report, gaze_report, blink_report, head_pose_report):
        # Weighted blend. Gaze and posture are the strongest, most literature-
        # backed confidence signals; blink rate is a softer secondary signal
        # so it's weighted lower and only penalizes at the extremes.
        # None means "no data", not "bad" -- don't let a missing signal drag
        # the score down; fall back to a neutral value for that component.
        posture_score = posture_report["score"] if posture_report["score"] is not None else 50.0
        gaze_score = gaze_report["score"] if gaze_report["score"] is not None else 50.0

        blink_rate = blink_report["blink_rate_per_min"]
        if blink_report["assessment"] in ("normal",):
            blink_score = 100.0
        elif blink_report["assessment"] in ("elevated", "low"):
            blink_score = 70.0
        elif blink_report["assessment"] == "high":
            blink_score = 45.0
        else:
            blink_score = 75.0  # undetected: neutral, don't penalize for a data gap

        head_score = head_pose_report.get("facing_camera_pct")
        if head_score is None:
            weights = {"posture": 0.4, "gaze": 0.4, "blink": 0.2}
            head_score = 0.0
        else:
            weights = {"posture": 0.3, "gaze": 0.35, "blink": 0.15, "head": 0.2}

        total = posture_score * weights["posture"] + gaze_score * weights["gaze"] + blink_score * weights["blink"]
        if "head" in weights:
            total += head_score * weights["head"]

        return round(total, 1)