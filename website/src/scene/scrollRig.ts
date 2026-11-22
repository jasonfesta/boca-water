import * as THREE from 'three';
import type {
  BottleScrollSection,
  PackMode,
  SceneViewMode,
  ScrollKeyframe,
  ScrollState,
} from './types';

/**
 * 4 dramatic, non-chaotic resting compositions at stops 0.00, 0.333, 0.667, 1.00.
 * Every resting pose is deliberately offset OPPOSITE the page text so typography
 * and the 3D crystal-clear PET can NEVER collide:
 * - Beat 1 (0.00, text LEFT):        Large commanding upright can on the RIGHT showing 'BOCA'.
 * - Beat 2 (0.333, text RIGHT):      Very large dramatic close-up in TOP-LEFT showing clear lid, liquid & 'water'/'BOCA'.
 * - Beat 3 (0.667, text BOTTOM-LEFT): Dramatic horizontal/sideways hero in UPPER-RIGHT with hypnotic slow axial spin.
 * - Beat 4 (1.00, text RIGHT):       Smaller, crisp sculptural can off to the LEFT with generous negative space.
 */
export const BOTTLE_SCROLL_KEYFRAMES: readonly ScrollKeyframe[] = [
  {
    at: 0.0,
    section: 'hero',
    bottlePos: [0.64, 0.02, 0.0],
    bottleRot: [0.04, -0.18, -0.03],
    bottleScale: 1.01,
    cameraPos: [0.0, 0.10, 4.46],
    cameraTarget: [0.16, 0.02, 0.0],
    cameraFov: 34,
  },
  {
    at: 1 / 3,
    section: 'silhouette',
    bottlePos: [-0.62, 0.28, 0.42],
    bottleRot: [0.22, 2.55, -0.16],
    bottleScale: 1.32,
    cameraPos: [0.16, 0.48, 3.05],
    cameraTarget: [-0.22, 0.24, 0.0],
    cameraFov: 32,
  },
  {
    at: 2 / 3,
    section: 'bubbles',
    bottlePos: [0.26, 0.38, 0.10],
    bottleRot: [0.06, 0.0, -Math.PI / 2],
    bottleScale: 1.04,
    cameraPos: [0.0, 0.12, 4.20],
    cameraTarget: [0.08, 0.12, 0.0],
    cameraFov: 34,
  },
  {
    at: 1.0,
    section: 'pack',
    bottlePos: [-0.74, -0.02, 0.0],
    bottleRot: [0.05, 0.24, 0.04],
    bottleScale: 0.80,
    cameraPos: [0.0, 0.10, 4.55],
    cameraTarget: [-0.18, 0.0, 0.0],
    cameraFov: 34,
  },
];

/** Dedicated Shop view pose (left side of viewport, opposite the 3 Shop pack options on the right) */
const SHOP_POSE: ScrollKeyframe = {
  at: 1.0,
  section: 'pack',
  bottlePos: [-0.62, -0.02, 0.0],
  bottleRot: [0.05, -0.22, 0.02],
  bottleScale: 0.96,
  cameraPos: [0.0, 0.12, 4.45],
  cameraTarget: [-0.16, 0.0, 0.0],
  cameraFov: 35,
};

export interface SampledPose {
  bottlePos: THREE.Vector3;
  bottleRot: THREE.Euler;
  bottleScale: number;
  cameraPos: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  cameraFov: number;
  section: BottleScrollSection;
  sectionProgress: number;
}

/** C2-continuous quintic easing for silky, non-chaotic stop-to-stop glides */
function smootherstep(t: number): number {
  const c = THREE.MathUtils.clamp(t, 0, 1);
  return c * c * c * (c * (c * 6 - 15) + 10);
}

/**
 * Evaluates the interpolated vessel & camera pose at a given 0..1 scroll progress.
 */
export function evaluateScrollPose(
  progress: number,
  out: SampledPose,
  aspect = 1.6
): SampledPose {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  const frames = BOTTLE_SCROLL_KEYFRAMES;

  let idx = 0;
  for (let i = 0; i < frames.length - 1; i++) {
    if (p >= frames[i].at && p <= frames[i + 1].at) {
      idx = i;
      break;
    }
  }

  const a = frames[idx];
  const b = frames[Math.min(idx + 1, frames.length - 1)];
  const span = Math.max(0.0001, b.at - a.at);
  const localT = THREE.MathUtils.clamp((p - a.at) / span, 0, 1);
  const eased = smootherstep(localT);

  const isNarrow = aspect < 0.95;
  const xScale = isNarrow ? 0.14 : 1.0;
  const zBoost = isNarrow ? 1.05 : 0.0;

  out.bottlePos.set(
    THREE.MathUtils.lerp(a.bottlePos[0], b.bottlePos[0], eased) * xScale,
    THREE.MathUtils.lerp(a.bottlePos[1], b.bottlePos[1], eased),
    THREE.MathUtils.lerp(a.bottlePos[2], b.bottlePos[2], eased)
  );

  out.bottleRot.set(
    THREE.MathUtils.lerp(a.bottleRot[0], b.bottleRot[0], eased),
    THREE.MathUtils.lerp(a.bottleRot[1], b.bottleRot[1], eased),
    THREE.MathUtils.lerp(a.bottleRot[2], b.bottleRot[2], eased),
    'ZXY'
  );

  out.bottleScale = THREE.MathUtils.lerp(a.bottleScale, b.bottleScale, eased);

  out.cameraPos.set(
    THREE.MathUtils.lerp(a.cameraPos[0], b.cameraPos[0], eased) * xScale,
    THREE.MathUtils.lerp(a.cameraPos[1], b.cameraPos[1], eased),
    THREE.MathUtils.lerp(a.cameraPos[2], b.cameraPos[2], eased) + zBoost
  );

  out.cameraTarget.set(
    THREE.MathUtils.lerp(a.cameraTarget[0], b.cameraTarget[0], eased) * xScale,
    THREE.MathUtils.lerp(a.cameraTarget[1], b.cameraTarget[1], eased),
    THREE.MathUtils.lerp(a.cameraTarget[2], b.cameraTarget[2], eased)
  );

  out.cameraFov = THREE.MathUtils.lerp(a.cameraFov, b.cameraFov, eased);

  out.section = localT < 0.5 ? a.section : b.section;
  out.sectionProgress = localT;

  return out;
}

export interface ScrollChoreographyRig {
  /** Current smoothed scroll state */
  readonly state: ScrollState;
  /** Feed raw scroll progress (0..1) from external prop or wheel/window scroll */
  setRawProgress: (raw: number) => void;
  /** Feed normalized pointer coordinates (-1..1) into the spring oscillator */
  setPointer: (x: number, y: number) => void;
  /** Add interactive drag spin impulse (radians) */
  addDragDelta: (dxRad: number, dyRad: number) => void;
  /** Advance smoothing, spring oscillation, view transitions, and apply transforms */
  update: (
    time: number,
    dt: number,
    stagePivot: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    aspect: number,
    activePackMode?: PackMode,
    packExpanded?: boolean,
    viewMode?: SceneViewMode
  ) => ScrollState;
}

export function createScrollChoreographyRig(): ScrollChoreographyRig {
  const state: ScrollState = {
    progress: 0,
    rawProgress: 0,
    velocity: 0,
    section: 'hero',
    sectionProgress: 0,
    pointerX: 0,
    pointerY: 0,
    packMode: '1-pack',
    packExpanded: false,
  };

  let targetPointerX = 0;
  let targetPointerY = 0;
  let springVelX = 0;
  let springVelY = 0;
  let prevTargetX = 0;
  let prevTargetY = 0;

  let dragYaw = 0;
  let dragPitch = 0;
  let prevSmoothed = 0;

  // Beat 3 hypnotic slow axial spin accumulator
  let beat3AxialSpin = 0;

  // Smooth view-mode transition choreography ('home' | 'shop' | 'about')
  let lastViewMode: SceneViewMode = 'home';
  let shopEntryTimer = 1.0; // 0 -> 0.42s glide off-screen, then slowly re-enter as pack
  let exitLiftY = 0; // 0 = on stage, -4.6 = glided cleanly off bottom of viewport
  let exitShiftX = 0;

  const pose: SampledPose = {
    bottlePos: new THREE.Vector3(),
    bottleRot: new THREE.Euler(0, 0, 0, 'ZXY'),
    bottleScale: 1,
    cameraPos: new THREE.Vector3(),
    cameraTarget: new THREE.Vector3(),
    cameraFov: 34,
    section: 'hero',
    sectionProgress: 0,
  };

  const setRawProgress = (raw: number) => {
    state.rawProgress = THREE.MathUtils.clamp(raw, 0, 1);
  };

  const setPointer = (x: number, y: number) => {
    const cx = THREE.MathUtils.clamp(x, -1, 1);
    const cy = THREE.MathUtils.clamp(y, -1, 1);
    springVelX += (cx - prevTargetX) * 1.9;
    springVelY += (cy - prevTargetY) * 1.6;
    prevTargetX = cx;
    prevTargetY = cy;
    targetPointerX = cx;
    targetPointerY = cy;
  };

  const addDragDelta = (dxRad: number, dyRad: number) => {
    dragYaw += dxRad;
    dragPitch = THREE.MathUtils.clamp(dragPitch + dyRad, -0.65, 0.65);
  };

  const update = (
    time: number,
    dt: number,
    stagePivot: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    aspect: number,
    activePackMode: PackMode = '1-pack',
    packExpanded = false,
    viewMode: SceneViewMode = 'home'
  ): ScrollState => {
    const clampedDt = Math.max(0.001, Math.min(dt, 0.045));

    // Detect view switches to trigger smooth exit -> slow enter choreography
    if (viewMode !== lastViewMode) {
      if (viewMode === 'shop') {
        shopEntryTimer = 0;
      }
      lastViewMode = viewMode;
    }
    if (viewMode === 'shop') {
      shopEntryTimer = Math.min(1.5, shopEntryTimer + clampedDt);
    }

    // Silky, fluid, non-chaotic scroll chase
    const scrollAlpha = 1 - Math.exp(-clampedDt * 7.5);
    state.progress = THREE.MathUtils.lerp(
      state.progress,
      state.rawProgress,
      scrollAlpha
    );

    const instantVel = (state.progress - prevSmoothed) / clampedDt;
    prevSmoothed = state.progress;
    state.velocity = THREE.MathUtils.lerp(
      state.velocity,
      instantVel,
      1 - Math.exp(-clampedDt * 9.0)
    );

    // Calm, tactile 2nd-order damped spring for pointer micro-oscillation (zero jitter)
    const stiffness = 18.0;
    const damping = 5.6;
    const ax = (targetPointerX - state.pointerX) * stiffness - springVelX * damping;
    const ay = (targetPointerY - state.pointerY) * stiffness - springVelY * damping;
    springVelX += ax * clampedDt;
    springVelY += ay * clampedDt;
    state.pointerX = THREE.MathUtils.clamp(
      state.pointerX + springVelX * clampedDt,
      -1.2,
      1.2
    );
    state.pointerY = THREE.MathUtils.clamp(
      state.pointerY + springVelY * clampedDt,
      -1.2,
      1.2
    );

    const dragDecay = Math.exp(-clampedDt * (0.5 + Math.abs(state.velocity) * 2.4));
    dragYaw *= dragDecay;
    dragPitch *= dragDecay;

    const isNarrow = aspect < 0.95;

    if (viewMode === 'shop') {
      const xScale = isNarrow ? 0.14 : 1.0;
      const zBoost = isNarrow ? 1.05 : 0.0;
      pose.bottlePos.set(
        SHOP_POSE.bottlePos[0] * xScale,
        SHOP_POSE.bottlePos[1],
        SHOP_POSE.bottlePos[2]
      );
      pose.bottleRot.set(
        SHOP_POSE.bottleRot[0],
        SHOP_POSE.bottleRot[1],
        SHOP_POSE.bottleRot[2],
        'ZXY'
      );
      pose.bottleScale = SHOP_POSE.bottleScale;
      pose.cameraPos.set(
        SHOP_POSE.cameraPos[0] * xScale,
        SHOP_POSE.cameraPos[1],
        SHOP_POSE.cameraPos[2] + zBoost
      );
      pose.cameraTarget.set(
        SHOP_POSE.cameraTarget[0] * xScale,
        SHOP_POSE.cameraTarget[1],
        SHOP_POSE.cameraTarget[2]
      );
      pose.cameraFov = SHOP_POSE.cameraFov;
      pose.section = 'pack';
      pose.sectionProgress = 1;
    } else {
      evaluateScrollPose(state.progress, pose, aspect);
    }

    state.section = pose.section;
    state.sectionProgress = pose.sectionProgress;
    state.packMode = activePackMode;
    state.packExpanded = packExpanded;

    // Smooth exit/enter glide for 'about' (off-screen) and 'shop' (exit -> slow enter)
    const shouldBeOffScreen =
      viewMode === 'about' || (viewMode === 'shop' && shopEntryTimer < 0.42);
    const targetExitY = shouldBeOffScreen ? -4.8 : 0;
    const targetExitX = viewMode === 'about' ? 1.15 : 0;
    const exitSpeed = shouldBeOffScreen ? 4.8 : 2.9; // Smooth exit, slow elegant enter
    exitLiftY = THREE.MathUtils.lerp(
      exitLiftY,
      targetExitY,
      1 - Math.exp(-clampedDt * exitSpeed)
    );
    exitShiftX = THREE.MathUtils.lerp(
      exitShiftX,
      targetExitX,
      1 - Math.exp(-clampedDt * exitSpeed)
    );

    // Beat 3 (p = 2/3) hypnotic slow axial spin showing both 'BOCA' and 'water' turning fluidly
    const distFromBeat3 = Math.abs(state.progress - 2 / 3);
    const beat3Weight =
      viewMode === 'home'
        ? Math.max(0, 1 - distFromBeat3 / 0.18)
        : 0;
    if (beat3Weight > 0.01) {
      beat3AxialSpin += clampedDt * 0.46 * beat3Weight;
    } else {
      // Settle axial spin gently back to 0 when leaving Beat 3
      const wrapped = Math.atan2(Math.sin(beat3AxialSpin), Math.cos(beat3AxialSpin));
      beat3AxialSpin = THREE.MathUtils.lerp(
        wrapped,
        0,
        1 - Math.exp(-clampedDt * 4.5)
      );
    }

    // Camera pullback & luxury 3/4 elevation when viewing 6-pack or 24-pack formations in Shop
    let packExtraZ = 0;
    let packExtraY = 0;
    let packPitch = 0;
    let packYaw = 0;
    let packScale = 1.0;

    if (activePackMode === '6-pack') {
      packExtraZ = (packExpanded ? 3.15 : 2.15) + (isNarrow ? 1.6 : 0);
      packExtraY = packExpanded ? 1.05 : 0.85;
      packPitch = 0.14;
      packYaw = -0.30;
      packScale = packExpanded ? 0.94 : 0.98;
    } else if (activePackMode === '24-pack') {
      packExtraZ = (packExpanded ? 7.6 : 6.1) + (isNarrow ? 2.6 : 0);
      packExtraY = packExpanded ? 1.45 : 1.15;
      packPitch = 0.16;
      packYaw = -0.34;
      packScale = packExpanded ? 0.84 : 0.88;
    }

    const floatY = Math.sin(time * 0.90) * 0.016;
    const idleYaw = Math.sin(time * 0.38) * 0.032 * (1 - beat3Weight);
    const idleRoll = Math.cos(time * 0.52) * 0.008;

    // 'ZXY' Euler order applies local Y (axial spin) FIRST, then pitch X, then sideways roll Z,
    // so Beat 3's horizontal can spins cleanly along its own length axis with zero tumble!
    stagePivot.rotation.order = 'ZXY';
    stagePivot.position.set(
      pose.bottlePos.x + exitShiftX,
      pose.bottlePos.y + floatY + exitLiftY,
      pose.bottlePos.z
    );

    stagePivot.rotation.set(
      pose.bottleRot.x + packPitch + state.pointerY * 0.085 + dragPitch,
      pose.bottleRot.y + packYaw + idleYaw + beat3AxialSpin + state.pointerX * 0.20 + dragYaw,
      pose.bottleRot.z + idleRoll - state.pointerX * 0.04,
      'ZXY'
    );

    stagePivot.scale.setScalar(pose.bottleScale * packScale);

    const desiredCamX = pose.cameraPos.x + state.pointerX * 0.08;
    const desiredCamY = pose.cameraPos.y + packExtraY - state.pointerY * 0.045;
    const desiredCamZ = pose.cameraPos.z + packExtraZ;

    camera.position.lerp(
      pose.cameraPos.set(desiredCamX, desiredCamY, desiredCamZ),
      1 - Math.exp(-clampedDt * 7.0)
    );
    camera.lookAt(pose.cameraTarget);

    const desiredFov =
      activePackMode === '24-pack' ? 38 : activePackMode === '6-pack' ? 36 : pose.cameraFov;
    if (Math.abs(camera.fov - desiredFov) > 0.02) {
      camera.fov = THREE.MathUtils.lerp(
        camera.fov,
        desiredFov,
        1 - Math.exp(-clampedDt * 7.0)
      );
      camera.updateProjectionMatrix();
    }

    return state;
  };

  return {
    state,
    setRawProgress,
    setPointer,
    addDragDelta,
    update,
  };
}
