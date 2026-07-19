# --- Face mesh (requires refine_landmarks=True for iris points 468-477) ---

LEFT_EYE_EAR_POINTS = [33, 160, 158, 133, 153, 144]   # outer, top1, top2, inner, bottom1, bottom2
RIGHT_EYE_EAR_POINTS = [263, 387, 385, 362, 380, 373]  # outer, top1, top2, inner, bottom1, bottom2

LEFT_IRIS = 468
LEFT_EYE_INNER = 133
LEFT_EYE_OUTER = 33
LEFT_EYE_TOP = 159
LEFT_EYE_BOTTOM = 145

RIGHT_IRIS = 473
RIGHT_EYE_INNER = 362
RIGHT_EYE_OUTER = 263
RIGHT_EYE_TOP = 386
RIGHT_EYE_BOTTOM = 374

# 6-point subset used for solvePnP head pose estimation.
# Order must match HEAD_POSE_3D_MODEL_POINTS in head_pose_analyzer.py
HEAD_POSE_LANDMARKS = {
    "nose_tip": 1,
    "chin": 152,
    "left_eye_outer": 33,
    "right_eye_outer": 263,
    "mouth_left": 61,
    "mouth_right": 291,
}
