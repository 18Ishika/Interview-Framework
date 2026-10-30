// Shared layout constants — tweak seat positions, desk and camera in one place.
export const ROOM = { width: 14, depth: 12, height: 4.6, backZ: -4.2 }

export const DESK = { width: 3.0, depth: 1.1, height: 0.76, position: [0, 0, -1.95] }

export const SEATS = {
  candidate: { position: [-1.4, 0, -2.7], rotationY: 0.55 },
  interviewer: { position: [1.4, 0, -2.7], rotationY: -0.55 },
}
export const CAMERA = {
  fov: 32,
  position: [0.4, 1.45, 1.9],
  lookAt: [0, 1.15, -2.6],
}
// Everything the camera does is tiny and slow on purpose.
export const CAMERA_MOTION = {
  dollyMeters: 0.3,
  dollyPeriodSec: 32,
  driftMeters: 0.2,
  driftPeriodSec: 21,
  bobMeters: 0.05,
  bobPeriodSec: 17,
  introSec: 3.5,
}

export const CAMERA_FOCUS = {
  interviewer: { position: [0.94, 1.3, -1.7], lookAt: [1.4, 1.28, -2.7] },
  candidate: { position: [-0.94, 1.3, -1.7], lookAt: [-1.4, 1.28, -2.7] },
}