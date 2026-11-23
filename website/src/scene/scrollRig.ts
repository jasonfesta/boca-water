import * as THREE from 'three';
import type {
  BottleScrollSection,
  PackMode,
  SceneViewMode,
  ScienceHotspotId,
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
    // Dramatic right-leaning diagonal (-0.30 rad) filling the right-side hero space
    bottlePos: [0.76, 0.00, 0.06],
    bottleRot: [0.04, -0.18, -0.30],
    bottleScale: 1.18,
    cameraPos: [0.0, 0.10, 4.30],
    cameraTarget: [0.20, 0.00, 0.0],
    cameraFov: 34,
  },
  {
    at: 1 / 3,
    section: 'silhouette',
    // Beat 2 preserved verbatim (large sculptural top-left close-up)
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
    // 100% horizontally perfect (exact 90 deg level, zero tilt), lowered ~73px from 0.72 -> 0.48
    // so the bottle sits vertically centered in the open Beat 3 stage above "Clarity you taste."
    bottlePos: [0.0, 0.48, 0.0],
    bottleRot: [0.0, 0.0, -Math.PI / 2],
    bottleScale: 0.90,
    cameraPos: [0.0, 0.48, 4.30],
    cameraTarget: [0.0, 0.24, 0.0],
    cameraFov: 34,
  },
  {
    at: 1.0,
    section: 'pack',
    // Middle-left channel between top-left BOCA WATER logo and right-aligned 'Live in the clear.'
    bottlePos: [-0.68, -0.06, 0.20],
    bottleRot: [0.10, -0.18, 0.16],
    bottleScale: 1.02,
    cameraPos: [0.0, 0.12, 4.35],
    cameraTarget: [-0.10, 0.0, 0.0],
    cameraFov: 34,
  },
];

/** Dedicated Shop view camera framing all 3 side-by-side real 3D formations (1 / 6 / 24) in center-upper 20-52% */
const SHOP_POSE: ScrollKeyframe = {
  at: 1.0,
  section: 'pack',
  bottlePos: [0.0, 0.0, 0.0],
  bottleRot: [0.0, 0.0, 0.0],
  bottleScale: 1.0,
  cameraPos: [0.0, 0.25, 8.6],
  cameraTarget: [0.0, -0.04, 0.0],
  cameraFov: 34,
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

const MOBILE_Y_OFFSETS: readonly number[] = [-0.04, 0.82, 0.08, -0.04];
const MOBILE_SCALE_FACTORS: readonly number[] = [
  1.06 / 1.18,
  0.68,
  0.96,
  1.12 / 1.02,
];
const MOBILE_Z_BOOSTS: readonly number[] = [1.05, 1.45, 1.45, 1.05];

/** Dramatic macro camera close-up poses for Science Stop 2 interactive 3D hotspots */
const SCIENCE_HOTSPOT_CAMERAS: Record<
  ScienceHotspotId,
  {
    cameraPos: readonly [number, number, number];
    target: readonly [number, number, number];
    rotY: number;
  }
> = {
  lid: {
    cameraPos: [-0.55, 1.38, 1.85],
    target: [0.08, 0.96, 0.0],
    rotY: -0.22,
  },
  formula: {
    cameraPos: [0.58, 0.62, 1.78],
    target: [-0.06, 0.50, 0.0],
    rotY: 0.14,
  },
  vessel: {
    cameraPos: [-0.62, 0.08, 1.92],
    target: [0.08, 0.02, 0.0],
    rotY: -0.18,
  },
  punt: {
    cameraPos: [0.56, -0.78, 1.88],
    target: [-0.06, -0.84, 0.0],
    rotY: 0.16,
  },
};

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
  const isPortraitMobile = aspect < 0.75;
  const xScale = isNarrow ? 0.14 : 1.0;

  const nextIdx = Math.min(idx + 1, frames.length - 1);
  const zBoost = isPortraitMobile
    ? THREE.MathUtils.lerp(MOBILE_Z_BOOSTS[idx], MOBILE_Z_BOOSTS[nextIdx], eased)
    : isNarrow
      ? 1.05
      : 0.0;
  const mobileYOffset = isPortraitMobile
    ? THREE.MathUtils.lerp(MOBILE_Y_OFFSETS[idx], MOBILE_Y_OFFSETS[nextIdx], eased)
    : isNarrow
      ? smootherstep(1 - Math.abs(p - 2 / 3) / 0.22) * 0.08
      : 0;
  const mobileScaleFactor = isPortraitMobile
    ? THREE.MathUtils.lerp(
        MOBILE_SCALE_FACTORS[idx],
        MOBILE_SCALE_FACTORS[nextIdx],
        eased
      )
    : 1.0;

  out.bottlePos.set(
    THREE.MathUtils.lerp(a.bottlePos[0], b.bottlePos[0], eased) * xScale,
    THREE.MathUtils.lerp(a.bottlePos[1], b.bottlePos[1], eased) + mobileYOffset,
    THREE.MathUtils.lerp(a.bottlePos[2], b.bottlePos[2], eased)
  );

  out.bottleRot.set(
    THREE.MathUtils.lerp(a.bottleRot[0], b.bottleRot[0], eased),
    THREE.MathUtils.lerp(a.bottleRot[1], b.bottleRot[1], eased),
    THREE.MathUtils.lerp(a.bottleRot[2], b.bottleRot[2], eased),
    'ZXY'
  );

  out.bottleScale =
    THREE.MathUtils.lerp(a.bottleScale, b.bottleScale, eased) * mobileScaleFactor;

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
  /** Notify rig when pointer drag starts or releases (enables silky inertial coast on release) */
  setDragging: (dragging: boolean) => void;
  /** Sync smoothed stage transform from an external animation (e.g. opening loader) to prevent 1-frame snaps */
  syncFromStage: (stagePivot: THREE.Object3D, camTarget?: THREE.Vector3) => void;
  /** Advance smoothing, spring oscillation, view transitions, and apply transforms */
  update: (
    time: number,
    dt: number,
    stagePivot: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    aspect: number,
    activePackMode?: PackMode,
    packExpanded?: boolean,
    viewMode?: SceneViewMode,
    storyScrollProgress?: number,
    directReturn?: boolean,
    activeHotspot?: ScienceHotspotId | null,
    isMobileViewport?: boolean
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
  let dragVelYaw = 0;
  let dragVelPitch = 0;
  let isUserDragging = false;
  let lastDragTime = 0;
  let prevSmoothed = 0;

  // Unrestricted 360-degree quaternionic arcball orbit for Design mode (zero gimbal lock, zero snap-back)
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  const WORLD_RIGHT = new THREE.Vector3(1, 0, 0);
  const IDENTITY_QUAT = new THREE.Quaternion();
  const designOrbitQuat = new THREE.Quaternion();
  const designStepQ1 = new THREE.Quaternion();
  const designStepQ2 = new THREE.Quaternion();
  let designOrbitVelX = 0;
  let designOrbitVelY = 0;
  let designOrbitActive = false;

  // Beat 3 hypnotic slow axial spin accumulator
  let beat3AxialSpin = 0;

  // Smooth view-mode transition choreography ('home' | 'shop' | 'science' | 'design' | 'press')
  let lastViewMode: SceneViewMode = 'home';
  let shopEntryTimer = 1.0;
  let shopExitHoldTimer = 0;
  let exitLiftY = 0;
  let exitShiftX = 0;
  let storySmoothed = 0;

  // Calm, drawn-out direct glide state (Beat 4 -> Beat 1 `directReturn`, zero wild spin/orbit)
  let wasDirectReturn = false;
  let orbitActive = false;
  let orbitElapsed = 0;
  const ORBIT_DURATION = 1.55;
  const orbitStartPos = new THREE.Vector3();
  const orbitStartQuat = new THREE.Quaternion();
  const orbitEndQuat = new THREE.Quaternion();
  const orbitEndEuler = new THREE.Euler(0, 0, 0, 'ZXY');
  const orbitEndPos = new THREE.Vector3();
  const orbitStartCamPos = new THREE.Vector3();
  const orbitEndCamPos = new THREE.Vector3();
  let orbitStartScale = 1;
  const orbitStartCamTarget = new THREE.Vector3();
  let orbitStartFov = 34;
  let orbitTargetProgress = 0;
  const currentCamTarget = new THREE.Vector3(0.2, 0, 0);
  const heroTargetPose: SampledPose = {
    bottlePos: new THREE.Vector3(),
    bottleRot: new THREE.Euler(0, 0, 0, 'ZXY'),
    bottleScale: 1,
    cameraPos: new THREE.Vector3(),
    cameraTarget: new THREE.Vector3(),
    cameraFov: 34,
    section: 'hero',
    sectionProgress: 0,
  };

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

  // Continuous smoothed 3D stage transform (zero single-frame snaps across Home <-> Shop <-> Science <-> Design)
  const smoothedPos = new THREE.Vector3();
  const smoothedQuat = new THREE.Quaternion();
  let smoothedScale = 1.0;
  let hasSmoothedPose = false;
  let viewTransitionTimer = 0;
  const desiredPos = new THREE.Vector3();
  const desiredEuler = new THREE.Euler(0, 0, 0, 'ZXY');
  const desiredQuat = new THREE.Quaternion();

  const syncFromStage = (
    stagePivot: THREE.Object3D,
    camTarget?: THREE.Vector3
  ) => {
    smoothedPos.copy(stagePivot.position);
    smoothedQuat.copy(stagePivot.quaternion);
    smoothedScale = stagePivot.scale.x || 1;
    hasSmoothedPose = true;
    if (camTarget) {
      currentCamTarget.copy(camTarget);
    }
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

  const setDragging = (dragging: boolean) => {
    isUserDragging = dragging;
    if (dragging) {
      lastDragTime = performance.now();
      dragVelYaw = 0;
      dragVelPitch = 0;
      designOrbitVelX = 0;
      designOrbitVelY = 0;
    }
  };

  const addDragDelta = (dxRad: number, dyRad: number) => {
    const now = performance.now();
    const dtSec = Math.max(0.004, Math.min((now - lastDragTime) / 1000, 0.08));
    lastDragTime = now;

    if (designOrbitActive) {
      // Full 360-degree world-space orbit around the entire bottle (front, back, white lid, base punt)
      designStepQ1.setFromAxisAngle(WORLD_UP, dxRad);
      designStepQ2.setFromAxisAngle(WORLD_RIGHT, dyRad);
      designOrbitQuat.premultiply(designStepQ1).premultiply(designStepQ2).normalize();

      const instVx = THREE.MathUtils.clamp(dxRad / dtSec, -12, 12);
      const instVy = THREE.MathUtils.clamp(dyRad / dtSec, -12, 12);
      designOrbitVelX = THREE.MathUtils.lerp(designOrbitVelX, instVx, 0.35);
      designOrbitVelY = THREE.MathUtils.lerp(designOrbitVelY, instVy, 0.35);
      return;
    }

    dragYaw += dxRad;
    dragPitch = THREE.MathUtils.clamp(dragPitch + dyRad, -0.65, 0.65);

    const instVelYaw = THREE.MathUtils.clamp(dxRad / dtSec, -10, 10);
    const instVelPitch = THREE.MathUtils.clamp(dyRad / dtSec, -5, 5);
    dragVelYaw = THREE.MathUtils.lerp(dragVelYaw, instVelYaw, 0.35);
    dragVelPitch = THREE.MathUtils.lerp(dragVelPitch, instVelPitch, 0.35);
  };

  const update = (
    time: number,
    dt: number,
    stagePivot: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    aspect: number,
    activePackMode: PackMode = '1-pack',
    packExpanded = false,
    viewMode: SceneViewMode = 'home',
    storyScrollProgress = 0,
    directReturn = false,
    activeHotspot: ScienceHotspotId | null = null,
    isMobileViewport = aspect < 0.75
  ): ScrollState => {
    const clampedDt = Math.max(0.001, Math.min(dt, 0.045));
    const isStoryView =
      viewMode === 'story' ||
      viewMode === 'science' ||
      viewMode === 'about' ||
      viewMode === 'design' ||
      viewMode === 'press';

    const isDesignView = viewMode === 'design';
    const isScienceOnlyView =
      viewMode === 'science' || viewMode === 'about' || viewMode === 'press';

    // Detect view switches: silky continuous damping with ZERO teleports, snaps, or jerks!
    if (viewMode !== lastViewMode) {
      const wasShop = lastViewMode === 'shop';
      viewTransitionTimer = 1.85;
      orbitActive = false;
      if (wasShop && viewMode !== 'shop') {
        // Let Shop's sequential reverse fade-out (Case -> Six-Pack -> Single) complete cleanly
        // before the Hero or Design bottle glides back onto the stage.
        shopExitHoldTimer = 0.72;
      } else if (viewMode === 'shop') {
        shopExitHoldTimer = 0;
      }

      if (viewMode === 'shop') {
        shopEntryTimer = 0;
        designOrbitVelX = 0;
        designOrbitVelY = 0;
      } else if (viewMode === 'home') {
        const targetP = THREE.MathUtils.clamp(state.rawProgress, 0, 1);
        beat3AxialSpin = 0;
        dragYaw = 0;
        dragPitch = 0;
        dragVelYaw = 0;
        dragVelPitch = 0;
        designOrbitVelX = 0;
        designOrbitVelY = 0;
        state.progress = targetP;
        prevSmoothed = targetP;
      } else if (isStoryView) {
        dragYaw = 0;
        dragPitch = 0;
        dragVelYaw = 0;
        dragVelPitch = 0;
        designOrbitVelX = 0;
        designOrbitVelY = 0;
        if (isDesignView) {
          designOrbitQuat.copy(IDENTITY_QUAT);
        }
      }
      lastViewMode = viewMode;
    }
    if (viewTransitionTimer > 0) {
      viewTransitionTimer = Math.max(0, viewTransitionTimer - clampedDt);
    }
    if (shopExitHoldTimer > 0) {
      shopExitHoldTimer = Math.max(0, shopExitHoldTimer - clampedDt);
      if (shopExitHoldTimer === 0) {
        viewTransitionTimer = Math.max(viewTransitionTimer, 1.45);
      }
    }
    if (viewMode === 'shop') {
      shopEntryTimer = Math.min(1.5, shopEntryTimer + clampedDt);
    }

    // Trigger calm, cinema-smooth direct glide on Beat 4 -> Beat 1 `directReturn` (shortest-angle slerp, zero crazy orbit)
    if (directReturn && !wasDirectReturn) {
      orbitActive = true;
      orbitElapsed = 0;
      orbitTargetProgress = 0;
      orbitStartPos.copy(stagePivot.position);
      orbitStartQuat.copy(stagePivot.quaternion);
      orbitStartScale = stagePivot.scale.x || 1;
      orbitStartCamPos.copy(camera.position);
      orbitStartCamTarget.copy(currentCamTarget);
      orbitStartFov = camera.fov;
      exitLiftY = 0;
      exitShiftX = 0;
      beat3AxialSpin = 0;
      dragYaw = 0;
      dragPitch = 0;
      dragVelYaw = 0;
      dragVelPitch = 0;
      state.progress = 0;
      state.rawProgress = 0;
      state.velocity = 0;
      prevSmoothed = 0;
    }
    wasDirectReturn = directReturn;

    // Cancel return glide gracefully if user actively scrolls away mid-flight
    if (
      orbitActive &&
      !directReturn &&
      Math.abs(state.rawProgress - orbitTargetProgress) > 0.06
    ) {
      orbitActive = false;
    }

    if (orbitActive && viewMode === 'home') {
      orbitElapsed = Math.min(ORBIT_DURATION, orbitElapsed + clampedDt);
      const tNorm = smootherstep(orbitElapsed / ORBIT_DURATION);
      const targetP = directReturn ? 0 : orbitTargetProgress;
      evaluateScrollPose(targetP, heroTargetPose, aspect);

      state.progress = targetP;
      if (directReturn) state.rawProgress = 0;
      state.velocity = 0;
      state.section = heroTargetPose.section;
      state.sectionProgress = heroTargetPose.sectionProgress;

      // Match live resting idle breath + pointer offset at tNorm = 1 so exit has 0.000 jump
      const heroFloatY = Math.sin(time * 0.90) * 0.016;
      const heroIdleYaw = Math.sin(time * 0.38) * 0.032;
      const heroIdleRoll = Math.cos(time * 0.52) * 0.008;

      orbitEndPos.set(
        heroTargetPose.bottlePos.x,
        heroTargetPose.bottlePos.y + heroFloatY,
        heroTargetPose.bottlePos.z
      );
      orbitEndEuler.set(
        heroTargetPose.bottleRot.x + state.pointerY * 0.085,
        heroTargetPose.bottleRot.y + heroIdleYaw + state.pointerX * 0.20,
        heroTargetPose.bottleRot.z + heroIdleRoll - state.pointerX * 0.04,
        'ZXY'
      );
      orbitEndQuat.setFromEuler(orbitEndEuler);

      stagePivot.rotation.order = 'ZXY';
      stagePivot.position.lerpVectors(orbitStartPos, orbitEndPos, tNorm);
      stagePivot.quaternion.slerpQuaternions(orbitStartQuat, orbitEndQuat, tNorm);
      stagePivot.scale.setScalar(
        THREE.MathUtils.lerp(orbitStartScale, heroTargetPose.bottleScale, tNorm)
      );

      // Calm, direct camera glide straight back to Beat 1 (zero wild orbit or radial swoop)
      orbitEndCamPos.set(
        heroTargetPose.cameraPos.x + state.pointerX * 0.08,
        heroTargetPose.cameraPos.y - state.pointerY * 0.045,
        heroTargetPose.cameraPos.z
      );
      camera.position.lerpVectors(orbitStartCamPos, orbitEndCamPos, tNorm);
      currentCamTarget.lerpVectors(orbitStartCamTarget, heroTargetPose.cameraTarget, tNorm);
      camera.lookAt(currentCamTarget);

      const nextFov = THREE.MathUtils.lerp(orbitStartFov, heroTargetPose.cameraFov, tNorm);
      if (Math.abs(camera.fov - nextFov) > 0.02) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }

      if (orbitElapsed >= ORBIT_DURATION && !directReturn) {
        orbitActive = false;
      }
      smoothedPos.copy(stagePivot.position);
      smoothedQuat.copy(stagePivot.quaternion);
      smoothedScale = stagePivot.scale.x || 1;
      hasSmoothedPose = true;
      return state;
    }

    // Soft, responsive damping on Science (0.0) & Design State 0 (1.0) <-> Design State 1 (0.0)
    const rawStoryTarget = isScienceOnlyView
      ? 0
      : THREE.MathUtils.clamp(storyScrollProgress, 0, 1);
    storySmoothed = THREE.MathUtils.lerp(
      storySmoothed,
      rawStoryTarget,
      1 - Math.exp(-clampedDt * 6.5)
    );

    // Enable unrestricted 360-deg orbit while inspecting the bottle in Design State 0
    designOrbitActive = isDesignView && storySmoothed > 0.35;

    // Silky, velvety scroll chase
    const scrollAlpha = 1 - Math.exp(-clampedDt * 4.6);
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

    // Weighted glass-in-oil drag physics:
    // - In Design State 0: silky inertial 360-deg coast with ZERO auto-snap-back so users can freely inspect every side
    // - Outside Design State 0: soft return to upright orientation
    if (designOrbitActive) {
      if (!isUserDragging) {
        designOrbitVelX *= Math.exp(-clampedDt * 2.4);
        designOrbitVelY *= Math.exp(-clampedDt * 2.4);
        if (Math.abs(designOrbitVelX) > 0.0004 || Math.abs(designOrbitVelY) > 0.0004) {
          designStepQ1.setFromAxisAngle(WORLD_UP, designOrbitVelX * clampedDt);
          designStepQ2.setFromAxisAngle(WORLD_RIGHT, designOrbitVelY * clampedDt);
          designOrbitQuat.premultiply(designStepQ1).premultiply(designStepQ2).normalize();
        }
      }
    } else {
      designOrbitVelX = 0;
      designOrbitVelY = 0;
      designOrbitQuat.slerp(IDENTITY_QUAT, 1 - Math.exp(-clampedDt * 2.6));
    }

    if (!isUserDragging) {
      dragVelYaw *= Math.exp(-clampedDt * 2.6);
      dragVelPitch *= Math.exp(-clampedDt * 3.5);
      dragYaw += dragVelYaw * clampedDt;
      dragPitch = THREE.MathUtils.clamp(
        dragPitch + dragVelPitch * clampedDt,
        -0.65,
        0.65
      );

      dragYaw = Math.atan2(Math.sin(dragYaw), Math.cos(dragYaw));
      const yawSettleRate = isStoryView
        ? 0.08 + Math.abs(storyScrollProgress - storySmoothed) * 0.9
        : 0.20 + Math.abs(state.velocity) * 1.4;
      dragYaw *= Math.exp(-clampedDt * yawSettleRate);
      dragPitch *= Math.exp(-clampedDt * 1.15);
    }

    const isNarrow = aspect < 0.95;
    const isPortraitMobile = aspect < 0.75;

    const holdingShopExit = shopExitHoldTimer > 0;
    const isMacroZoom = false;
    void activeHotspot;

    if (viewMode === 'shop' || holdingShopExit) {
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
      if (isPortraitMobile) {
        // Mobile portrait (< 768px): frame vertically stacked 1 / 6 / 24 real 3D formations cleanly
        pose.cameraPos.set(0.0, 0.15, 5.2);
        pose.cameraTarget.set(0.0, 0.0, 0.0);
      } else {
        // Desktop (>= 768px): untouched 3-column horizontal trio framing
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
      }
      pose.cameraFov = SHOP_POSE.cameraFov;
      pose.section = 'pack';
      pose.sectionProgress = 1;
    } else if (isStoryView) {
      // Unified 2-Swipe Science (0.0) <-> Design (1.0) Choreography:
      // - Swipe 1 (0.0, Science): bottle smoothly tucked below off-screen.
      // - Swipe 2 (1.0, Design):
      //   * Desktop (>= 768px): bold commanding horizontal bottle (scale 1.24, ~76% viewport width),
      //     dead-centered below header (y = -0.10), HORIZONTAL (z = -PI/2 so "BOCA" reads left-to-right, right-side-up!).
      //   * Mobile (< 768px): larger centered upright bottle (scale 0.71), dead-centered below header (y = -0.08),
      //     VERTICAL upright (z = 0) with balanced top & bottom breathing room.
      const isHorizontalDesign = !isMobileViewport;
      const zBoost = isPortraitMobile ? 0.85 : isNarrow ? 0.55 : 0.0;
      const bottleY = isHorizontalDesign ? -0.06 : -0.06;
      // 1.02 scale on Desktop keeps the bottle monumental horizontally AND 100% framed
      // inside the viewport when rotated vertically end-over-end 360 degrees!
      const bottleScale = isHorizontalDesign ? 1.02 : 0.70;
      const designRollZ = isHorizontalDesign ? -Math.PI / 2 : 0.0;

      pose.bottlePos.set(0.0, bottleY, 0.0);
      pose.bottleScale = bottleScale;

      if (isMacroZoom && activeHotspot) {
        const hs = SCIENCE_HOTSPOT_CAMERAS[activeHotspot];
        pose.bottleRot.set(
          0.0,
          (isHorizontalDesign ? hs.rotY * 0.65 : hs.rotY) + Math.sin(time * 0.45) * 0.045,
          designRollZ,
          'ZXY'
        );
        if (isHorizontalDesign) {
          // Bottle rotated -90 deg around Z: local +Y maps to world +X (lid on right, punt on left).
          // Lift zoomed horizontal bottle cleanly into the upper band so lower-left floating editorial text
          // sits over 100% pure open canvas with zero collision.
          const featureX = hs.target[1] * bottleScale;
          const sideOffsetX =
            activeHotspot === 'lid' || activeHotspot === 'formula' ? 0.28 : -0.28;
          pose.cameraPos.set(featureX + sideOffsetX, bottleY - 0.42, 3.55);
          pose.cameraTarget.set(featureX, bottleY - 0.92, 0.0);
          pose.cameraFov = 31;
        } else {
          // Mobile vertical macro zoom: frame feature cleanly in upper 60% completely above bottom floating text
          const mobileZoomZ = 1.35;
          const mobileTargetShiftY = -0.95;
          pose.cameraPos.set(
            hs.cameraPos[0] * 0.35,
            hs.cameraPos[1] * bottleScale + bottleY - 0.36,
            hs.cameraPos[2] + mobileZoomZ
          );
          pose.cameraTarget.set(
            0.0,
            hs.target[1] * bottleScale + bottleY + mobileTargetShiftY,
            hs.target[2]
          );
          pose.cameraFov = 32;
        }
      } else {
        const storyTurn = (storySmoothed - 1.0) * Math.PI * 0.45;
        pose.bottleRot.set(
          0.0,
          (isHorizontalDesign ? 0.0 : -0.18) + storyTurn,
          designRollZ,
          'ZXY'
        );
        pose.cameraPos.set(0.0, 0.0, 4.35 + zBoost);
        pose.cameraTarget.set(0.0, 0.0, 0.0);
        pose.cameraFov = 34;
      }
      pose.section = 'hero';
      pose.sectionProgress = storySmoothed;
    } else {
      evaluateScrollPose(state.progress, pose, aspect);
    }

    state.section = pose.section;
    state.sectionProgress = pose.sectionProgress;
    state.packMode = activePackMode;
    state.packExpanded = packExpanded;

    // Single-stage smooth off-screen offset (zero double-damping lag!):
    // - 'shop' (or holding while Shop packs fade out): hero can glides cleanly off-screen (-4.8)
    // - 'science' / 'press' (0.0) <-> 'design' (1.0): tucked cleanly below (-3.6) at 0.0, dead-center at 1.0
    const storyEnter = isStoryView
      ? smootherstep((storySmoothed - 0.08) / 0.84)
      : 1.0;
    exitLiftY =
      viewMode === 'shop' || holdingShopExit
        ? -4.8
        : isStoryView
          ? (1 - storyEnter) * -3.6
          : 0;
    exitShiftX = 0;

    // Beat 3 (p = 2/3) & Beat 4 (p = 1.0) smooth C2-enveloped hypnotic axial spin (BOCA <-> WATER)
    // Wide smootherstep envelopes guarantee zero lock-state jumping across desktop & mobile,
    // and shortest-angle decay unwinds Beat 4 -> Beat 1 like silk with zero jerk.
    const beat3Weight =
      viewMode === 'home'
        ? smootherstep(1 - Math.abs(state.progress - 2 / 3) / 0.22)
        : 0;
    const beat4Weight =
      viewMode === 'home'
        ? smootherstep(1 - Math.abs(state.progress - 1.0) / 0.22)
        : 0;
    const spinWeight = Math.max(beat3Weight, beat4Weight);

    // Keep axial spin wrapped cleanly in [-PI, PI] at all times so unwinding NEVER jumps
    beat3AxialSpin = Math.atan2(
      Math.sin(beat3AxialSpin),
      Math.cos(beat3AxialSpin)
    );
    if (spinWeight > 0.35 && Math.abs(state.velocity) < 0.45) {
      beat3AxialSpin += clampedDt * 0.44 * spinWeight;
    } else {
      const unwindRate = 3.2 + Math.abs(state.velocity) * 4.5;
      beat3AxialSpin = THREE.MathUtils.lerp(
        beat3AxialSpin,
        0,
        1 - Math.exp(-clampedDt * unwindRate)
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

    // Keep Beat 3 100% mathematically horizontal (suppress idleRoll & pointer tilt on Beat 3);
    // give the upright Science/Story bottle a subtle organic living oscillation
    const levelLock = 1 - beat3Weight;
    const floatY = isStoryView
      ? Math.sin(time * 0.85) * 0.024
      : Math.sin(time * 0.90) * 0.016;
    const idleYaw = isStoryView
      ? Math.sin(time * 0.52) * 0.048
      : Math.sin(time * 0.38) * 0.032 * (1 - spinWeight);
    const idleRoll = isStoryView
      ? Math.cos(time * 0.60) * 0.014
      : Math.cos(time * 0.52) * 0.008 * levelLock;

    // 'ZXY' Euler order applies local Y (axial spin) FIRST, then pitch X, then sideways roll Z,
    // so horizontal cans (Beat 3 & Desktop Design) roll cleanly along their own length axis with zero tumble!
    const isDesktopHorizontalDesign = isStoryView && !isMobileViewport;
    const designLevelLock = isDesktopHorizontalDesign ? 0 : levelLock;
    desiredPos.set(
      pose.bottlePos.x + exitShiftX,
      pose.bottlePos.y + floatY + exitLiftY,
      pose.bottlePos.z
    );
    if (isDesignView) {
      desiredEuler.set(
        pose.bottleRot.x,
        pose.bottleRot.y + idleYaw * 0.35,
        pose.bottleRot.z,
        'ZXY'
      );
      desiredQuat.setFromEuler(desiredEuler);
      // Pre-multiply unrestricted 360-degree world-space orbit so dragging turns smoothly in every direction
      desiredQuat.premultiply(designOrbitQuat).normalize();
    } else {
      desiredEuler.set(
        pose.bottleRot.x + packPitch + state.pointerY * 0.085 * designLevelLock + dragPitch,
        pose.bottleRot.y + packYaw + idleYaw + beat3AxialSpin + state.pointerX * 0.20 + dragYaw,
        pose.bottleRot.z + (isDesktopHorizontalDesign ? 0 : idleRoll) - state.pointerX * 0.04 * designLevelLock,
        'ZXY'
      );
      desiredQuat.setFromEuler(desiredEuler);
    }
    const desiredScale = pose.bottleScale * packScale;

    if (!hasSmoothedPose) {
      smoothedPos.copy(desiredPos);
      smoothedQuat.copy(desiredQuat);
      smoothedScale = desiredScale;
      hasSmoothedPose = true;
    } else {
      const posRate =
        viewMode === 'shop'
          ? 6.2
          : viewTransitionTimer > 0
            ? 4.8
            : isStoryView
              ? 5.6
              : 7.5;
      const rotRate =
        designOrbitActive && isUserDragging
          ? 20.0
          : designOrbitActive
            ? 11.0
            : viewTransitionTimer > 0
              ? 4.8
              : isStoryView
                ? 5.6
                : 8.5;
      const posAlpha = 1 - Math.exp(-clampedDt * posRate);
      const rotAlpha = 1 - Math.exp(-clampedDt * rotRate);
      smoothedPos.lerp(desiredPos, posAlpha);
      smoothedQuat.slerp(desiredQuat, rotAlpha);
      smoothedScale = THREE.MathUtils.lerp(smoothedScale, desiredScale, posAlpha);
    }

    stagePivot.rotation.order = 'ZXY';
    stagePivot.position.copy(smoothedPos);
    stagePivot.quaternion.copy(smoothedQuat);
    stagePivot.scale.setScalar(smoothedScale);

    const desiredCamX = pose.cameraPos.x + state.pointerX * 0.08;
    const desiredCamY = pose.cameraPos.y + packExtraY - state.pointerY * 0.045;
    const desiredCamZ = pose.cameraPos.z + packExtraZ;

    const camLerpRate = viewTransitionTimer > 0 ? 4.6 : isStoryView ? 5.0 : 5.6;
    const camAlpha = 1 - Math.exp(-clampedDt * camLerpRate);
    camera.position.lerp(
      pose.cameraPos.set(desiredCamX, desiredCamY, desiredCamZ),
      camAlpha
    );
    currentCamTarget.lerp(pose.cameraTarget, camAlpha);
    camera.lookAt(currentCamTarget);

    const desiredFov =
      activePackMode === '24-pack' ? 38 : activePackMode === '6-pack' ? 36 : pose.cameraFov;
    if (Math.abs(camera.fov - desiredFov) > 0.02) {
      camera.fov = THREE.MathUtils.lerp(
        camera.fov,
        desiredFov,
        camAlpha
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
    setDragging,
    syncFromStage,
    update,
  };
}
