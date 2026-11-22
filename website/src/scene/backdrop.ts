import * as THREE from 'three';
import type {
  BackdropHandle,
  BackdropOptions,
  ScrollState,
} from './types';

/**
 * Tunable parameters for the zero-shadow diagonal obsidian shine ->
 * nocturnal rippling water backdrop (`website/src/scene/backdrop.ts`).
 * Strictly dark obsidian, charcoal, and neutral silver-slate (zero purple,
 * zero bright cyan, zero drop shadows or floor umbras).
 */
export interface BackdropTuneParams {
  /** Overall studio shine & nocturnal water specular multiplier */
  intensity: number;
  /** Deep obsidian void base color */
  obsidianColor: string;
  /** Mid-tone charcoal-slate for the diagonal top-right -> bottom-left shine */
  shineMidColor: string;
  /** Restrained silver-slate peak of the top-right -> bottom-left shine */
  shinePeakColor: string;
  /** Deep nocturnal water trough color */
  waterDeepColor: string;
  /** Nocturnal moonlight specular shimmer tint (neutral cool silver-white) */
  moonSpecularColor: string;
  /** Subtle pointer parallax strength */
  parallaxStrength: number;
}

export const DEFAULT_BACKDROP_TUNE_PARAMS: BackdropTuneParams = {
  intensity: 1.0,
  obsidianColor: '#030304',
  shineMidColor: '#0c0f14',
  shinePeakColor: '#1d222a',
  waterDeepColor: '#020305',
  moonSpecularColor: '#bcc8d6',
  parallaxStrength: 0.04,
};

const BACKDROP_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Far-plane NDC quad (transparent: false) so Three.js includes both the
    // diagonal studio shine and nocturnal rippling water inside the physical
    // transmission buffer refracted through the crystal-clear PET can.
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const BACKDROP_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uAspect;
  uniform float uIntensity;
  uniform float uScrollProgress;
  uniform float uWaterMix;
  uniform float uScrollEnergy;
  uniform vec2 uPointer;
  uniform vec4 uRipples[4]; // xy = aspect-corrected center, z = age (sec), w = strength
  uniform vec3 uObsidian;
  uniform vec3 uShineMid;
  uniform vec3 uShinePeak;
  uniform vec3 uWaterDeep;
  uniform vec3 uMoonSpec;

  // Screen-space triangular-PDF dither to eliminate 8-bit dark-mode banding
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float triDither(vec2 fragCoord) {
    float n1 = hash12(fragCoord);
    float n2 = hash12(fragCoord + vec2(17.13, 31.71));
    return (n1 + n2 - 1.0) / 255.0;
  }

  // Smooth value noise for organic nocturnal water micro-variation
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // Multi-octave directional Gerstner-like wave + interactive concentric ripples
  float waterHeight(vec2 wp, vec2 screenP, float t) {
    float h = 0.0;

    // 5 irrational-angle nocturnal wave trains (broad swells + fine capillary ripples)
    h += sin(dot(wp, vec2(1.35, 1.85)) + t * 0.62) * 0.24;
    h += sin(dot(wp, vec2(-1.95, 1.42)) - t * 0.78) * 0.19;
    h += sin(dot(wp, vec2(0.65, 3.15)) + t * 1.05) * 0.13;
    h += sin(dot(wp, vec2(-3.25, -2.10)) + t * 1.32) * 0.085;
    h += sin(dot(wp, vec2(4.80, -3.65)) - t * 1.65) * 0.052;

    // Fine wind-driven capillary FBM detail
    float n1 = vnoise(wp * 2.1 + vec2(t * 0.22, -t * 0.16));
    float n2 = vnoise(wp * 4.4 + vec2(-t * 0.30, t * 0.24));
    h += (n1 * 0.65 + n2 * 0.35 - 0.5) * 0.18;

    // Subtle expanding concentric ripples disturbed by pointer & scroll velocity
    for (int i = 0; i < 4; i++) {
      vec4 rip = uRipples[i];
      if (rip.w > 0.002) {
        float dist = length(screenP - rip.xy);
        float radius = rip.z * 0.68;
        float ring = exp(-pow((dist - radius) * 5.2, 2.0));
        float wave = sin((dist - radius) * 28.0);
        float fade = exp(-rip.z * 0.95) * exp(-dist * 1.15);
        h += wave * ring * fade * rip.w * 0.36;
      }
    }

    return h;
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= uAspect;

    // -------------------------------------------------------------------------
    // 1. HERO STATE: Diagonal TOP-RIGHT -> BOTTOM-LEFT Studio Shine (zero shadows)
    // -------------------------------------------------------------------------
    // Main diagonal runs from bottom-left (0,0) to top-right (1,1).
    // Slight pointer parallax glides the diagonal sheen subtly.
    vec2 uvShifted = vUv + uPointer * vec2(0.05, -0.04);
    float diagPerp = (uvShifted.x - uvShifted.y) - 0.04;
    float diagAlong = clamp((uvShifted.x + uvShifted.y) * 0.5, 0.0, 1.0);

    // Broad sleek diagonal studio sweep + crisp inner specular ribbon
    float broadBand = exp(-pow(diagPerp * 1.95, 2.0));
    float innerRibbon = exp(-pow((diagPerp + 0.02) * 4.2, 2.0));

    // Restrained directional luminance gradient strongest at top-right, tapering smoothly to bottom-left
    float trGradient = smoothstep(0.02, 1.0, diagAlong);
    float heroShine = broadBand * (0.34 + 0.66 * trGradient) + innerRibbon * (0.18 + 0.42 * trGradient);

    // Subtle organic breathing so the obsidian silk surface feels alive
    float breath = 1.0 + sin(uTime * 0.24) * 0.025;

    vec3 heroCol = uObsidian;
    heroCol = mix(heroCol, uShineMid, clamp(broadBand * 0.85 * uIntensity * breath, 0.0, 1.0));
    heroCol += uShinePeak * heroShine * 0.58 * uIntensity * breath;

    // Soft perimeter darkening back to deep obsidian #030304 (no circular pool, no cast shadow)
    float edgeFade = smoothstep(1.45, 0.35, length(vec2((vUv.x - 0.5) * 1.45, (vUv.y - 0.5) * 1.45)));
    heroCol = mix(uObsidian, heroCol, mix(0.42, 1.0, edgeFade));

    // -------------------------------------------------------------------------
    // 2. SCROLL STATE: High-Craft Dark Nighttime Rippling Water
    // -------------------------------------------------------------------------
    vec3 finalCol = heroCol;

    if (uWaterMix > 0.001) {
      // Gentle perspective foreshortening looking across a calm nocturnal water surface
      float depth = 0.45 + (1.0 - vUv.y) * 1.15;
      vec2 wp = vec2(p.x / (0.62 + depth * 0.48), 2.15 / depth + uScrollProgress * 2.8);
      wp += uPointer * vec2(0.18, -0.14);

      float wt = uTime * 0.85 + uScrollProgress * 1.6;

      // Analytical finite-difference normal from heightfield
      float eps = 0.026;
      float hC = waterHeight(wp, p, wt);
      float hX = waterHeight(wp + vec2(eps, 0.0), p + vec2(0.012, 0.0), wt);
      float hY = waterHeight(wp + vec2(0.0, eps), p + vec2(0.0, 0.012), wt);

      float bumpScale = 0.55 + uScrollEnergy * 0.28;
      vec3 N = normalize(vec3((hC - hX) * bumpScale / eps, (hC - hY) * bumpScale / eps, 1.0));

      // View direction and nocturnal moonlight direction aligned with the top-right -> bottom-left axis
      vec3 V = normalize(vec3(-p.x * 0.16, -p.y * 0.16, 1.0));
      vec3 L = normalize(vec3(0.54, 0.62, 0.57));
      vec3 H = normalize(L + V);

      // Fresnel sky reflection + crisp nocturnal moonlight specular facets
      float ndv = max(dot(N, V), 0.0);
      float fresnel = pow(1.0 - ndv, 3.4);
      float ndl = max(dot(N, L), 0.0);

      float specTight = pow(max(dot(N, H), 0.0), 96.0);
      float specMid = pow(max(dot(N, H), 0.0), 22.0);
      float specBroad = pow(max(dot(N, H), 0.0), 6.0);

      // Diagonal moonlight path sweeping from top-right to bottom-left across the dark ripples
      float moonPath = exp(-pow(diagPerp * 1.65, 2.0)) * (0.42 + 0.58 * trGradient);

      vec3 waterCol = uWaterDeep;
      waterCol = mix(waterCol, uShineMid * 0.95, clamp(fresnel * 0.65 + ndl * 0.22 + specBroad * 0.25 * moonPath, 0.0, 1.0));
      waterCol += uShinePeak * specMid * (0.28 + 0.52 * moonPath) * uIntensity;
      waterCol += uMoonSpec * specTight * (0.34 + 0.46 * moonPath) * uIntensity;

      // Subtle crest shimmer along active ripple rings
      float rippleGlint = smoothstep(0.10, 0.42, hC) * 0.045 * moonPath;
      waterCol += uMoonSpec * rippleGlint * uIntensity;

      // Keep water dark, moody, and obsidian-framed so crystal PET can & white text pop cleanly
      float waterVig = smoothstep(1.52, 0.26, length(vec2((vUv.x - 0.5) * 1.55, (vUv.y - 0.5) * 1.55)));
      waterCol = mix(uObsidian, waterCol, mix(0.32, 1.0, waterVig));

      finalCol = mix(heroCol, waterCol, uWaterMix);
    }

    finalCol = max(finalCol, vec3(0.0));
    gl_FragColor = vec4(finalCol, 1.0);
    // Encode linear THREE.Color uniforms accurately to sRGB
    #include <colorspace_fragment>
    // Apply 8-bit triangular-PDF dither in output sRGB space for zero banding
    gl_FragColor.rgb = max(gl_FragColor.rgb + vec3(triDither(gl_FragCoord.xy)), vec3(0.0));
  }
`;

/**
 * Creates the zero-shadow diagonal obsidian shine -> nighttime rippling water backdrop.
 * - Hero (scroll 0): Deep obsidian with a sleek top-right -> bottom-left studio shine.
 * - Scroll (0.15 -> 1.0): Smoothly transitions into moody, high-craft dark nighttime
 *   water with procedural Gerstner/FBM ripples disturbed by pointer & scroll velocity.
 */
export function createBackdrop(
  options: BackdropOptions = {},
  tuneOverrides: Partial<BackdropTuneParams> = {}
): BackdropHandle {
  const params: BackdropTuneParams = {
    ...DEFAULT_BACKDROP_TUNE_PARAMS,
    ...tuneOverrides,
    intensity:
      options.intensity ??
      tuneOverrides.intensity ??
      DEFAULT_BACKDROP_TUNE_PARAMS.intensity,
  };

  const geometry = new THREE.PlaneGeometry(2, 2);

  const rippleSlots: THREE.Vector4[] = [
    new THREE.Vector4(0.35, 0.22, 10.0, 0.0),
    new THREE.Vector4(-0.28, -0.15, 10.0, 0.0),
    new THREE.Vector4(0.12, -0.30, 10.0, 0.0),
    new THREE.Vector4(-0.35, 0.28, 10.0, 0.0),
  ];

  const uniforms = {
    uTime: { value: 0 },
    uAspect: { value: 16 / 9 },
    uIntensity: { value: params.intensity },
    uScrollProgress: { value: 0 },
    uWaterMix: { value: 0 },
    uScrollEnergy: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uRipples: { value: rippleSlots },
    uObsidian: { value: new THREE.Color(params.obsidianColor) },
    uShineMid: { value: new THREE.Color(params.shineMidColor) },
    uShinePeak: { value: new THREE.Color(params.shinePeakColor) },
    uWaterDeep: { value: new THREE.Color(params.waterDeepColor) },
    uMoonSpec: { value: new THREE.Color(params.moonSpecularColor) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: BACKDROP_VERTEX_SHADER,
    fragmentShader: BACKDROP_FRAGMENT_SHADER,
    uniforms,
    depthTest: true,
    depthWrite: false,
    transparent: false,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'BocaOrbBackdrop';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;

  let prevTime = 0;
  let lastPtrX = 0;
  let lastPtrY = 0;
  let rippleCooldown = 0;
  let nextRippleIdx = 0;
  let ambientRippleTimer = 0;

  const current = {
    pointerX: 0,
    pointerY: 0,
    waterMix: 0,
    scrollEnergy: 0,
  };

  const spawnRipple = (x: number, y: number, strength: number): void => {
    const slot = rippleSlots[nextRippleIdx];
    slot.set(x, y, 0.0, Math.min(1.0, strength));
    nextRippleIdx = (nextRippleIdx + 1) % rippleSlots.length;
  };

  const update = (
    time: number,
    scroll: ScrollState,
    viewport: { width: number; height: number }
  ): void => {
    const dt = prevTime > 0 ? Math.min(0.05, Math.max(0.001, time - prevTime)) : 0.016;
    prevTime = time;

    const aspect =
      viewport.height > 0 ? viewport.width / viewport.height : 16 / 9;

    // Smooth hero diagonal shine -> nocturnal water transition across scroll 0.12..0.52
    const rawWaterMix = THREE.MathUtils.smoothstep(scroll.progress, 0.12, 0.52);
    current.waterMix += (rawWaterMix - current.waterMix) * 0.08;

    const targetEnergy = Math.min(1.0, Math.abs(scroll.velocity) * 0.85);
    current.scrollEnergy += (targetEnergy - current.scrollEnergy) * 0.1;

    const targetPtrX = scroll.pointerX * params.parallaxStrength;
    const targetPtrY = -scroll.pointerY * params.parallaxStrength * 0.8;
    current.pointerX += (targetPtrX - current.pointerX) * 0.08;
    current.pointerY += (targetPtrY - current.pointerY) * 0.08;

    // Advance active water ripples
    for (let i = 0; i < rippleSlots.length; i++) {
      const slot = rippleSlots[i];
      if (slot.w > 0.001) {
        slot.z += dt;
        if (slot.z > 4.2) {
          slot.w = 0.0;
        }
      }
    }

    // Spawn ripples on pointer motion or scroll velocity when nighttime water is active
    rippleCooldown = Math.max(0, rippleCooldown - dt);
    const ptrDelta = Math.hypot(scroll.pointerX - lastPtrX, scroll.pointerY - lastPtrY);
    lastPtrX = scroll.pointerX;
    lastPtrY = scroll.pointerY;

    if (current.waterMix > 0.05) {
      if (rippleCooldown <= 0 && (ptrDelta > 0.045 || Math.abs(scroll.velocity) > 0.18)) {
        const rx =
          ptrDelta > 0.045
            ? scroll.pointerX * aspect * 0.85
            : Math.sin(time * 1.7 + scroll.progress * 9.0) * aspect * 0.35;
        const ry =
          ptrDelta > 0.045
            ? -scroll.pointerY * 0.85
            : Math.cos(time * 1.3 - scroll.progress * 7.0) * 0.35;
        const strength = Math.min(0.85, 0.35 + ptrDelta * 2.2 + Math.abs(scroll.velocity) * 0.45);
        spawnRipple(rx, ry, strength);
        rippleCooldown = 0.38;
      }

      // Gentle ambient nocturnal water pulse every ~2.4s so the surface feels alive even at rest
      ambientRippleTimer += dt;
      if (ambientRippleTimer > 2.4) {
        ambientRippleTimer = 0;
        spawnRipple(
          Math.sin(time * 0.73) * aspect * 0.45,
          Math.cos(time * 0.59) * 0.42,
          0.38
        );
      }
    }

    uniforms.uTime.value = time;
    uniforms.uAspect.value = aspect;
    uniforms.uScrollProgress.value = scroll.progress;
    uniforms.uWaterMix.value = current.waterMix;
    uniforms.uScrollEnergy.value = current.scrollEnergy;
    uniforms.uPointer.value.set(current.pointerX, current.pointerY);
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
  };

  return {
    mesh,
    update,
    dispose,
  };
}
