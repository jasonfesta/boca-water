import * as THREE from 'three';
import type {
  BackdropHandle,
  BackdropOptions,
  ScrollState,
} from './types';

/**
 * Research-backed 3-Stage Physical Water Backdrop (`website/src/scene/backdrop.ts`):
 *  - Stage 1 (Hero / Beat 1): True 256x256 HalfFloat ping-pong FBO 2D shallow-water
 *    wave-equation PDE (`h_new = ((hL+hR+hU+hD)*0.5 - h_prev) * damping`) driven by
 *    live pointer velocity & organic drops, refracting the diagonal top-right -> bottom-left
 *    studio sheen in both Light Mode (default #f5f4f0) and Dark Mode (#030304).
 *  - Stage 2 (Beats 2 -> 3): Progressively deeper capillary liquid surface refraction
 *    and subtle optical caustic shimmer.
 *  - Stage 3 (Beat 4): True 3D perspective ocean horizon using the shipped 8-wave
 *    deep-water Gerstner dispersion spectrum (L = 78 -> 3.1m, ΣQ = 0.77), per-wave
 *    fwidth pixel footprint fade (zero far-horizon moire), analytic per-pixel normals,
 *    R.y = abs(R.y) + 0.002 reflection clamp, Schlick Fresnel (F0 = 0.02), and shared
 *    sky haze function — sunlit coastal sea in Light Mode, moonlit nocturnal ocean in
 *    Dark Mode. Zero purple, zero drop shadows.
 */
export interface BackdropTuneParams {
  intensity: number;
  obsidianColor: string;
  shineMidColor: string;
  shinePeakColor: string;
  waterDeepDarkColor: string;
  moonSpecularColor: string;
  lightBaseColor: string;
  lightShadowColor: string;
  lightPeakColor: string;
  parallaxStrength: number;
}

export const DEFAULT_BACKDROP_TUNE_PARAMS: BackdropTuneParams = {
  intensity: 1.0,
  obsidianColor: '#020305',
  shineMidColor: '#06080c',
  shinePeakColor: '#0f141d',
  waterDeepDarkColor: '#010203',
  moonSpecularColor: '#c4d2e0',
  lightBaseColor: '#f5f4f0',
  lightShadowColor: '#e8e6e0',
  lightPeakColor: '#ffffff',
  parallaxStrength: 0.035,
};

// ---------------------------------------------------------------------------
// 256x256 Ping-Pong FBO Shallow-Water Wave-Equation PDE Shaders
// ---------------------------------------------------------------------------
const SIM_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const SIM_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uCurr;
  uniform sampler2D uPrev;
  uniform vec2 uTexel;
  uniform vec2 uDropPos;
  uniform float uDropRadius;
  uniform float uDropStrength;
  uniform float uDamping;

  void main() {
    float cL = texture2D(uCurr, vUv - vec2(uTexel.x, 0.0)).r;
    float cR = texture2D(uCurr, vUv + vec2(uTexel.x, 0.0)).r;
    float cD = texture2D(uCurr, vUv - vec2(0.0, uTexel.y)).r;
    float cU = texture2D(uCurr, vUv + vec2(0.0, uTexel.y)).r;
    float prev = texture2D(uPrev, vUv).r;

    // 2D Shallow-Water Wave Equation PDE (Verlet / leapfrog integration)
    float next = ((cL + cR + cD + cU) * 0.5 - prev) * uDamping;

    // Smooth Gaussian drop / cursor wake impulse
    if (uDropStrength > 0.0001) {
      float d = length(vUv - uDropPos);
      float drop = exp(- (d * d) / max(0.00004, uDropRadius * uDropRadius));
      next += drop * uDropStrength;
    }

    // Gentle radial outer damping (never a rectangular border discontinuity!)
    float rEdge = length(vUv - 0.5);
    float radialDamp = 1.0 - smoothstep(0.34, 0.50, rEdge) * 0.16;
    next *= radialDamp;
    next = clamp(next, -1.2, 1.2);

    gl_FragColor = vec4(next, 0.0, 0.0, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Main 3-Stage Physical Water Backdrop Shader
// ---------------------------------------------------------------------------
const BACKDROP_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Far-plane NDC quad (transparent: false) so Three.js includes all 3 water
    // stages inside the physical transmission buffer refracted through the PET can.
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
  uniform float uLiquidMix;
  uniform float uOceanMix;
  uniform float uDarkMix;
  uniform float uHasFbo;
  uniform vec2 uPointer;
  uniform sampler2D uRippleTex;
  uniform vec2 uRippleTexel;
  uniform vec3 uObsidian;
  uniform vec3 uShineMid;
  uniform vec3 uShinePeak;
  uniform vec3 uWaterDeepDark;
  uniform vec3 uMoonSpec;
  uniform vec3 uLightBase;
  uniform vec3 uLightShadow;
  uniform vec3 uLightPeak;

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

  // Analytical shared sky + horizon haze function (both sky & ocean fog sample this
  // exact function so the sea melts into the sky with zero hard seam line).
  // Beat 4 ("Live in the clear.") bathes the horizon in luminous sunlit 24k champagne-gold
  // in Light Mode and molten gold-on-obsidian in Dark Mode.
  vec3 evalSkyHaze(vec3 rd, vec3 lightDir, float darkMix) {
    float elev = clamp(max(rd.y, 0.0), 0.0, 1.0);
    float lCos = max(dot(normalize(rd), lightDir), 0.0);

    vec3 goldGlow = vec3(1.0, 0.80, 0.26);
    vec3 goldCore = vec3(1.0, 0.96, 0.80);

    // Dark Mode: Warm obsidian zenith melting into whispered molten-gold horizon glow
    vec3 nightZenith = vec3(0.0018, 0.0014, 0.0008);
    vec3 nightHorizon = vec3(0.026, 0.017, 0.0045);
    vec3 nightSky = mix(nightHorizon, nightZenith, pow(elev, 0.48));
    nightSky += goldGlow * (pow(lCos, 16.0) * 0.11 + pow(lCos, 68.0) * 0.24) * uIntensity;
    nightSky += goldCore * pow(lCos, 160.0) * 0.18 * uIntensity;

    // Light Mode: Sunlit warm alabaster-champagne sky with golden-hour solar aureole
    vec3 dayZenith = vec3(0.91, 0.88, 0.80);
    vec3 dayHorizon = vec3(0.99, 0.95, 0.85);
    vec3 daySky = mix(dayHorizon, dayZenith, pow(elev, 0.58));
    daySky += goldGlow * (pow(lCos, 10.0) * 0.18 + pow(lCos, 44.0) * 0.26);
    daySky += goldCore * pow(lCos, 110.0) * 0.24;

    return mix(daySky, nightSky, darkMix);
  }

  // Organic 3D world-space twinkling 24k gold & diamond facet sparkles riding Gerstner waves.
  // Fine jewel-scale pinpoints modulated by wave slope & sun path, footprint-antialiased so
  // near & mid water shimmers with luxury golden dust while the horizon stays silky smooth.
  void evalGoldWaterSparkles(
    vec2 worldXZ,
    vec3 N,
    float crestFactor,
    float specDot,
    float t,
    float footprint,
    out float outGoldHalo,
    out float outDiamondCore
  ) {
    outGoldHalo = 0.0;
    outDiamondCore = 0.0;

    // Layer 1: Crisp sunlit diamond-gold micro-glints along shimmering wave crests
    float fade1 = 1.0 - smoothstep(0.14, 1.45, footprint);
    if (fade1 > 0.004) {
      vec2 p1 = worldXZ * 2.35 + vec2(t * 0.14, -t * 0.26);
      vec2 c1 = floor(p1);
      float hA = hash12(c1);
      float hB = hash12(c1 + vec2(19.37, 47.11));
      float hC = hash12(c1 + vec2(73.91, 13.53));
      vec2 jitter = vec2(hB - 0.5, hC - 0.5) * 0.62;
      vec2 d = fract(p1) - 0.5 - jitter;

      float dist = length(d);
      float core = smoothstep(0.072, 0.009, dist);
      // Delicate needle-fine 4-point sunlight glint (never oversized dots)
      float star =
        exp(-abs(d.x) * 64.0) * exp(-abs(d.y) * 14.0) +
        exp(-abs(d.y) * 64.0) * exp(-abs(d.x) * 14.0);
      float halo = smoothstep(0.20, 0.02, dist) * 0.45 + star * 0.36;

      float waveTilt = dot(N.xz, vec2(10.5, 8.2));
      float tw = pow(max(0.0, sin(t * (2.2 + hB * 3.2) + hA * 62.83 + waveTilt)), 12.0);
      float gate = step(0.54, hA);
      float sunBias = 0.18 + 0.82 * clamp(pow(specDot, 2.6) + crestFactor * 0.42, 0.0, 1.0);

      outGoldHalo += gate * tw * halo * sunBias * fade1;
      outDiamondCore += gate * tw * (core + star * 0.44) * sunBias * fade1;
    }

    // Layer 2: Ultra-fine 24k champagne gold-dust sparkle across sunlit ripples
    float fade2 = 1.0 - smoothstep(0.06, 0.72, footprint);
    if (fade2 > 0.004) {
      vec2 p2 = worldXZ * 5.4 + vec2(-t * 0.20, t * 0.32);
      vec2 c2 = floor(p2);
      float hA = hash12(c2 + vec2(111.7, 29.3));
      float hB = hash12(c2 + vec2(53.1, 89.7));
      float hC = hash12(c2 + vec2(37.9, 17.2));
      vec2 jitter = vec2(hB - 0.5, hC - 0.5) * 0.60;
      vec2 d = fract(p2) - 0.5 - jitter;

      float dist = length(d);
      float core = smoothstep(0.095, 0.014, dist);
      float halo = smoothstep(0.24, 0.03, dist) * 0.52;

      float waveTilt = dot(N.xz, vec2(-13.0, 11.5));
      float tw = pow(max(0.0, sin(t * (2.8 + hC * 3.8) + hA * 62.83 + waveTilt)), 10.0);
      float gate = step(0.46, hA);
      float sunBias = 0.20 + 0.80 * clamp(pow(specDot, 2.0) + crestFactor * 0.55, 0.0, 1.0);

      outGoldHalo += gate * tw * halo * sunBias * fade2 * 0.92;
      outDiamondCore += gate * tw * core * sunBias * fade2 * 0.88;
    }

    // Layer 3: Mid-distance sun-path glittering shimmer dust (bridges near glints to horizon silk)
    float fade3 = smoothstep(0.04, 0.28, footprint) * (1.0 - smoothstep(0.42, 2.4, footprint));
    if (fade3 > 0.004) {
      vec2 p3 = worldXZ * 1.45 + vec2(t * 0.09, -t * 0.15);
      vec2 c3 = floor(p3);
      float hA = hash12(c3 + vec2(211.3, 91.7));
      float hB = hash12(c3 + vec2(83.5, 141.2));
      vec2 d = fract(p3) - 0.5 - vec2(hB - 0.5, hA - 0.5) * 0.52;
      float core = smoothstep(0.065, 0.008, length(d));
      float tw = pow(max(0.0, sin(t * (2.4 + hB * 2.8) + hA * 62.83 + dot(N.xz, vec2(7.0, 9.0)))), 11.0);
      float sunCorridor = pow(specDot, 4.0);
      outGoldHalo += step(0.42, hA) * tw * core * sunCorridor * fade3 * 0.95;
      outDiamondCore += step(0.42, hA) * tw * core * sunCorridor * fade3 * 1.1;
    }
  }

  // 8-Wave Deep-Water Gerstner Dispersion Spectrum (exact ratios from 3d-ultra-realistic-water)
  // Evaluates per-pixel analytic derivatives (dP/dx, dP/dz) with per-wave pixel footprint fade!
  void evalGerstnerOcean(
    vec2 xz,
    float t,
    float footprint,
    out vec3 outNormal,
    out float outCrest
  ) {
    vec3 dPdx = vec3(1.0, 0.0, 0.0);
    vec3 dPdz = vec3(0.0, 0.0, 1.0);
    float crestAcc = 0.0;

    // 8 wavelengths L = 78 -> 3.1m (x0.63), amplitudes A = 0.72 -> 0.022m, headings off wind
    // Pre-normalized 2D wave directions
    vec2 dirs[8];
    dirs[0] = vec2( 0.24,  0.97);
    dirs[1] = vec2( 0.60,  0.80);
    dirs[2] = vec2(-0.07,  0.99);
    dirs[3] = vec2( 0.79,  0.61);
    dirs[4] = vec2(-0.31,  0.95);
    dirs[5] = vec2( 0.44,  0.90);
    dirs[6] = vec2(-0.60,  0.80);
    dirs[7] = vec2( 0.95,  0.31);

    float Ls[8];
    Ls[0] = 78.0; Ls[1] = 49.1; Ls[2] = 31.0; Ls[3] = 19.5;
    Ls[4] = 12.3; Ls[5] = 7.75; Ls[6] = 4.88; Ls[7] = 3.08;

    float As[8];
    As[0] = 0.68; As[1] = 0.46; As[2] = 0.30; As[3] = 0.20;
    As[4] = 0.13; As[5] = 0.082; As[6] = 0.048; As[7] = 0.026;

    float Qs[8];
    Qs[0] = 0.16; Qs[1] = 0.14; Qs[2] = 0.12; Qs[3] = 0.10;
    Qs[4] = 0.085; Qs[5] = 0.068; Qs[6] = 0.052; Qs[7] = 0.038;

    for (int i = 0; i < 8; i++) {
      float L = Ls[i];
      // Per-wave pixel footprint fade prevents far-horizon moire & boiling
      float fade = 1.0 - smoothstep(0.18 * L, 0.50 * L, footprint);
      if (fade > 0.002) {
        float k = 6.2831853 / L;
        float w = sqrt(9.81 * k); // Deep-water dispersion relation
        float A = As[i] * fade;
        float Q = Qs[i];
        vec2 D = dirs[i];
        float phase = k * dot(D, xz) - w * t;
        float c = cos(phase);
        float s = sin(phase);
        float WA = k * A;

        dPdx.x -= Q * D.x * D.x * WA * s;
        dPdx.y += D.x * WA * c;
        dPdx.z -= Q * D.x * D.y * WA * s;

        dPdz.x -= Q * D.x * D.y * WA * s;
        dPdz.y += D.y * WA * c;
        dPdz.z -= Q * D.y * D.y * WA * s;

        crestAcc += max(0.0, s) * fade * 0.16;
      }
    }

    // Two-octave fine capillary wind detail (footprint faded cleanly)
    float microFade = 1.0 - smoothstep(0.12, 1.35, footprint);
    if (microFade > 0.005) {
      vec2 m1 = xz * 0.42 + vec2(t * 0.25, -t * 0.48);
      vec2 m2 = vec2(-xz.y, xz.x) * 0.96 + vec2(-t * 0.34, t * 0.62);
      float n1x = vnoise(m1 + vec2(0.08, 0.0)) - vnoise(m1 - vec2(0.08, 0.0));
      float n1z = vnoise(m1 + vec2(0.0, 0.08)) - vnoise(m1 - vec2(0.0, 0.08));
      float n2x = vnoise(m2 + vec2(0.08, 0.0)) - vnoise(m2 - vec2(0.08, 0.0));
      float n2z = vnoise(m2 + vec2(0.0, 0.08)) - vnoise(m2 - vec2(0.0, 0.08));
      dPdx.y += (n1x * 0.22 + n2x * 0.14) * microFade;
      dPdz.y += (n1z * 0.22 + n2z * 0.14) * microFade;
    }

    outNormal = normalize(cross(dPdz, dPdx));
    outCrest = clamp(crestAcc, 0.0, 1.0);
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    p.x *= uAspect;

    // Sample 256x256 ping-pong FBO shallow-water PDE heightfield & compute exact gradient
    // Smoothly feathered away from all 4 screen edges so zero rectangular border can ever appear.
    vec2 fboGrad = vec2(0.0);
    float fboH = 0.0;
    if (uHasFbo > 0.5) {
      float edgeMask =
        smoothstep(0.02, 0.20, vUv.x) *
        smoothstep(0.98, 0.80, vUv.x) *
        smoothstep(0.02, 0.20, vUv.y) *
        smoothstep(0.98, 0.80, vUv.y);
      fboH = texture2D(uRippleTex, vUv).r * edgeMask;
      float hL = texture2D(uRippleTex, vUv - vec2(uRippleTexel.x, 0.0)).r;
      float hR = texture2D(uRippleTex, vUv + vec2(uRippleTexel.x, 0.0)).r;
      float hD = texture2D(uRippleTex, vUv - vec2(0.0, uRippleTexel.y)).r;
      float hU = texture2D(uRippleTex, vUv + vec2(0.0, uRippleTexel.y)).r;
      fboGrad = vec2(hL - hR, hD - hU) * (3.45 * edgeMask);
    }

    // -------------------------------------------------------------------------
    // STAGE 1 & 2 (BEATS 1-3): Diagonal Shine + Live Ping-Pong FBO Ripples
    // Uniform warp-coherent early-out skips Stage 1-2 completely at full Beat 4 ocean
    // -------------------------------------------------------------------------
    vec3 studioCol = vec3(0.0);
    if (uOceanMix < 0.995) {
      vec2 capillaryGrad = vec2(0.0);
      if (uLiquidMix > 0.005) {
        vec2 capUv = p * (2.6 + uScrollProgress * 1.4) + vec2(uTime * 0.18, -uTime * 0.24);
        float cX = vnoise(capUv + vec2(0.04, 0.0)) - vnoise(capUv - vec2(0.04, 0.0));
        float cY = vnoise(capUv + vec2(0.0, 0.04)) - vnoise(capUv - vec2(0.0, 0.04));
        float c2X = vnoise(capUv * 2.1 + vec2(-uTime * 0.22, 0.04)) - vnoise(capUv * 2.1 + vec2(-uTime * 0.22, -0.04));
        float c2Y = vnoise(capUv * 2.1 + vec2(0.04, uTime * 0.20)) - vnoise(capUv * 2.1 + vec2(-0.04, uTime * 0.20));
        capillaryGrad = vec2(cX + c2X * 0.55, cY + c2Y * 0.55) * (0.72 * uLiquidMix);
      }

      vec2 totalGrad = fboGrad + capillaryGrad;
      vec3 surfN = normalize(vec3(totalGrad.x * 0.95, totalGrad.y * 0.95, 1.0));
      vec3 surfV = vec3(0.0, 0.0, 1.0);
      vec3 surfL = normalize(vec3(0.58, 0.62, 0.52)); // Top-right -> bottom-left diagonal light
      vec3 surfH = normalize(surfL + surfV);

      float ndh = max(dot(surfN, surfH), 0.0);
      float slopeLight = dot(totalGrad, normalize(vec2(0.707, 0.707)));
      float crest = max(slopeLight, 0.0);
      float trough = max(-slopeLight, 0.0);

      // Refract the diagonal top-right -> bottom-left studio shine through the live PDE water surface
      vec2 uvRefr = vUv + uPointer * vec2(0.04, -0.03) + totalGrad * 0.042;
      float diagPerp = (uvRefr.x - uvRefr.y) - 0.04;
      float diagAlong = clamp((uvRefr.x + uvRefr.y) * 0.5, 0.0, 1.0);

      float broadBand = exp(-pow(diagPerp * 1.95, 2.0));
      float innerRibbon = exp(-pow((diagPerp + 0.02) * 4.2, 2.0));
      float trGradient = smoothstep(0.02, 1.0, diagAlong);
      float heroShine = broadBand * (0.34 + 0.66 * trGradient) + innerRibbon * (0.18 + 0.42 * trGradient);

      vec3 stageDark = vec3(0.0);
      if (uDarkMix > 0.002) {
        // Dark Mode Beats 1-3: Velvety liquid-obsidian silk (#020305..#080b10) with
        // sleek razor-fine micro-silver ripple glints — zero cloudy fog, zero gray noise!
        float specDarkRazor = pow(ndh, 180.0);
        stageDark = uObsidian;
        stageDark = mix(stageDark, uShineMid, clamp(broadBand * 0.56 * uIntensity, 0.0, 1.0));
        stageDark += uShinePeak * heroShine * 0.28 * uIntensity;
        stageDark = mix(stageDark, uWaterDeepDark, clamp(trough * 0.68 + uLiquidMix * 0.24, 0.0, 0.74));
        stageDark += uMoonSpec * (crest * 0.095 + specDarkRazor * (0.16 + 0.18 * uLiquidMix)) * (0.35 + 0.65 * broadBand) * uIntensity;
        float darkVig = smoothstep(1.38, 0.24, length(vec2((vUv.x - 0.5) * 1.52, (vUv.y - 0.5) * 1.52)));
        stageDark = mix(uObsidian, stageDark, mix(0.28, 1.0, darkVig));
      }

      vec3 stageLight = vec3(0.0);
      if (uDarkMix < 0.998) {
        // Light Mode Beats 1-3: Crisp Orbs warm gallery white (#f5f4f0) + diagonal sunlight sheen
        // + ~2.4x clearer cool-mineral refractive troughs, sunlit specular crests & soft caustic focus
        float specSharp = pow(ndh, 68.0);
        float specSoft = pow(ndh, 16.0);
        float causticFocus = clamp(abs(fboH) * 1.85, 0.0, 1.0);
        stageLight = mix(uLightShadow, uLightBase, mix(0.56, 1.0, trGradient));
        stageLight = mix(stageLight, uLightPeak, clamp(heroShine * 0.40 * uIntensity, 0.0, 0.52));
        vec3 lightTroughCol = vec3(0.58, 0.63, 0.68);
        stageLight = mix(stageLight, lightTroughCol, clamp(trough * 0.72 + (0.055 * uLiquidMix * (1.0 - trGradient)), 0.0, 0.52));
        stageLight = mix(stageLight, uLightPeak, clamp(crest * 1.15 + causticFocus * 0.28 + specSoft * 0.18 + specSharp * (0.42 + 0.32 * uLiquidMix), 0.0, 0.88));
      }

      studioCol = mix(stageLight, stageDark, uDarkMix);
    }

    // -------------------------------------------------------------------------
    // STAGE 3 (BEAT 4): REAL 3D PERSPECTIVE GERSTNER OCEAN HORIZON
    // -------------------------------------------------------------------------
    vec3 finalCol = studioCol;

    if (uOceanMix > 0.005) {
      // Shore-level perspective camera (2.8m above water) looking out across a real horizon (~60% height)
      vec3 ro = vec3(uPointer.x * 2.2, 2.8, 0.0);
      vec3 rd = normalize(vec3(p.x * 0.68, (vUv.y - 0.60) * 1.24 - uPointer.y * 0.035, 1.0));

      // Low coastal moon / sun direction slightly left-of-center so the broken glitter
      // refracts dramatically THROUGH the crystal-clear PET can while keeping the right
      // half calm and dark for razor-sharp Beat 4 text & button legibility.
      vec3 lightDir = normalize(vec3(-0.22, 0.15, 1.0));
      vec3 skyCol = evalSkyHaze(rd, lightDir, uDarkMix);
      vec3 oceanScene = skyCol;

      if (rd.y < -0.0012) {
        float dist = -ro.y / rd.y;
        float dClamped = min(dist, 420.0);
        vec2 worldXZ = ro.xz + rd.xz * dClamped;

        // Per-pixel world footprint for exact wave anti-aliasing (zero horizon boiling!)
        float footprint = 2.0 * (fwidth(worldXZ.x) + fwidth(worldXZ.y));
        footprint = max(footprint, dClamped * 0.006);

        vec3 N;
        float crestFactor;
        evalGerstnerOcean(worldXZ, uTime * 0.95, footprint, N, crestFactor);

        // Blend live ping-pong FBO cursor ripples onto the near foreground ocean
        float nearMask = 1.0 / (1.0 + dClamped * 0.045);
        N = normalize(N + vec3(fboGrad.x * 0.24 * nearMask, 0.0, fboGrad.y * 0.24 * nearMask));

        vec3 V = -rd;
        vec3 R = reflect(-V, N);
        // Critical skill law: clamp reflection above horizon to prevent pale grey smears on wave backs
        R.y = abs(R.y) + 0.002;
        R = normalize(R);

        float ndv = max(dot(N, V), 0.0);
        // Physical water Schlick Fresnel (F0 = 0.02)
        float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

        vec3 reflCol = evalSkyHaze(R, lightDir, uDarkMix);

        // GGX-style multi-lobe 24k golden specular shimmer + 3D wave-coupled gold facet sparkles
        float specDot = max(dot(R, lightDir), 0.0);
        float sparkleHalo = 0.0;
        float sparkleCore = 0.0;
        evalGoldWaterSparkles(worldXZ, N, crestFactor, specDot, uTime * 0.95, footprint, sparkleHalo, sparkleCore);

        vec3 gold24k = vec3(1.00, 0.76, 0.16);
        vec3 goldChampagne = vec3(1.00, 0.89, 0.46);
        vec3 goldDiamond = vec3(1.00, 0.98, 0.86);

        vec3 seaDark = vec3(0.0);
        if (uDarkMix > 0.002) {
          // Dark Mode: Glossy black-obsidian sea troughs + molten 24k gold ribbons & dancing diamond-gold sparkles
          vec3 deepDarkBody = vec3(0.003, 0.002, 0.0006) + vec3(0.052, 0.034, 0.006) * crestFactor;
          seaDark = mix(deepDarkBody, reflCol, clamp(fresnel * 0.80, 0.0, 0.86));
          float darkGoldRazor = pow(specDot, 220.0) * 1.65;
          float darkGoldSilk = pow(specDot, 46.0) * 0.42;
          float darkGoldWake = pow(specDot, 11.0) * 0.085;
          seaDark += (goldDiamond * darkGoldRazor + goldChampagne * darkGoldSilk + gold24k * darkGoldWake) * uIntensity;
          seaDark += (gold24k * sparkleHalo * 1.15 + goldDiamond * sparkleCore * 1.65) * uIntensity;
        }

        vec3 seaLight = vec3(0.0);
        if (uDarkMix < 0.998) {
          // Light Mode: Luminous clear champagne-gold coastal water (zero gray!) with
          // warm translucent amber-gold troughs, molten 24k wave crests, and crisp twinkling sparkles
          float glitterTight = pow(specDot, 180.0) * 1.35;
          float glitterMid = pow(specDot, 38.0) * 0.48;
          float glitterBroad = pow(specDot, 9.0) * 0.22;
          vec3 deepLightBody = vec3(0.46, 0.32, 0.09) + vec3(0.44, 0.30, 0.06) * crestFactor;
          seaLight = mix(deepLightBody, reflCol, clamp(fresnel * 0.78 + 0.16, 0.0, 0.92));
          seaLight += gold24k * glitterBroad + goldChampagne * glitterMid + goldDiamond * glitterTight;
          seaLight += gold24k * sparkleHalo * 0.85 + goldDiamond * sparkleCore * 1.25;
        }

        vec3 seaCol = mix(seaLight, seaDark, uDarkMix);

        // Fog ocean into the exact same golden-hour sky haze function (zero hard horizon seam!)
        float horizonFog = 1.0 - exp(-dClamped * 0.0068);
        oceanScene = mix(seaCol, skyCol, clamp(horizonFog, 0.0, 1.0));
      }

      // Soft atmospheric edge vignette in Dark Mode so white typography stays razor-legible
      float oceanVig = smoothstep(1.62, 0.32, length(vec2((vUv.x - 0.5) * 1.45, (vUv.y - 0.5) * 1.45)));
      vec3 framedOcean = mix(uObsidian, oceanScene, mix(0.50, 1.0, oceanVig));
      oceanScene = mix(oceanScene, framedOcean, uDarkMix);

      finalCol = mix(studioCol, oceanScene, uOceanMix);
    }

    finalCol = max(finalCol, vec3(0.0));
    gl_FragColor = vec4(finalCol, 1.0);
    // Accurate linear -> sRGB encoding
    #include <colorspace_fragment>
    // 8-bit triangular-PDF dither in sRGB output space (zero gradient banding)
    gl_FragColor.rgb = max(gl_FragColor.rgb + vec3(triDither(gl_FragCoord.xy)), vec3(0.0));
  }
`;

/**
 * Creates the 3-Stage Physical Water Backdrop:
 *   1. Live 256x256 ping-pong FBO shallow-water PDE cursor ripples (active from Beat 1 / Hero)
 *   2. Progressive capillary liquid refraction across Beats 2 -> 3
 *   3. Real 3D perspective 8-wave Gerstner ocean horizon on Beat 4
 * Defaults to Light Mode (#130) unless `theme: 'dark'` is passed.
 */
export function createBackdrop(
  options: BackdropOptions & { theme?: 'dark' | 'light'; renderer?: THREE.WebGLRenderer } = {},
  tuneOverrides: Partial<BackdropTuneParams> = {}
): BackdropHandle & { setTheme: (theme: 'dark' | 'light') => void } {
  const params: BackdropTuneParams = {
    ...DEFAULT_BACKDROP_TUNE_PARAMS,
    ...tuneOverrides,
    intensity:
      options.intensity ??
      tuneOverrides.intensity ??
      DEFAULT_BACKDROP_TUNE_PARAMS.intensity,
  };

  // Default to Light Mode (#130) unless 'dark' is explicitly requested
  let targetDarkMix = options.theme === 'dark' ? 1.0 : 0.0;
  const renderer = options.renderer ?? null;

  // -------------------------------------------------------------------------
  // Adaptive Ping-Pong FBO Shallow-Water Simulation (128px mobile/SW, 256px desktop)
  // -------------------------------------------------------------------------
  let isSoftwareWebGL = false;
  if (renderer) {
    try {
      const gl = renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      isSoftwareWebGL = /swiftshader|llvmpipe|software/i.test(rendererStr);
    } catch {
      isSoftwareWebGL = false;
    }
  }
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
  const isLowPower = isMobileViewport || isSoftwareWebGL;
  const SIM_SIZE = isLowPower ? 128 : 256;
  const MAX_SIM_SUBSTEPS = isLowPower ? 1 : 2;
  let simEnabled = false;
  let rtPrev: THREE.WebGLRenderTarget | null = null;
  let rtCurr: THREE.WebGLRenderTarget | null = null;
  let rtNext: THREE.WebGLRenderTarget | null = null;
  let simScene: THREE.Scene | null = null;
  let simCamera: THREE.OrthographicCamera | null = null;
  let simGeo: THREE.PlaneGeometry | null = null;
  let simMat: THREE.ShaderMaterial | null = null;
  // Hoisted reusable Vector4s to guarantee zero per-frame allocations in stepFbo()
  const savedViewport = new THREE.Vector4();
  const savedScissor = new THREE.Vector4();

  const dummyTex = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 255]),
    1,
    1,
    THREE.RGBAFormat
  );
  dummyTex.needsUpdate = true;

  if (renderer) {
    const rtOpts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    rtPrev = new THREE.WebGLRenderTarget(SIM_SIZE, SIM_SIZE, rtOpts);
    rtCurr = new THREE.WebGLRenderTarget(SIM_SIZE, SIM_SIZE, rtOpts);
    rtNext = new THREE.WebGLRenderTarget(SIM_SIZE, SIM_SIZE, rtOpts);

    simScene = new THREE.Scene();
    simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    simGeo = new THREE.PlaneGeometry(2, 2);
    simMat = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX_SHADER,
      fragmentShader: SIM_FRAGMENT_SHADER,
      uniforms: {
        uCurr: { value: rtCurr.texture },
        uPrev: { value: rtPrev.texture },
        uTexel: { value: new THREE.Vector2(1 / SIM_SIZE, 1 / SIM_SIZE) },
        uDropPos: { value: new THREE.Vector2(0.5, 0.5) },
        uDropRadius: { value: 0.028 },
        uDropStrength: { value: 0.0 },
        uDamping: { value: 0.976 },
      },
      depthTest: false,
      depthWrite: false,
    });
    simScene.add(new THREE.Mesh(simGeo, simMat));

    // Seed 3 calm initial PDE drops so the first Hero frame shows real interfering rings
    const savedTarget = renderer.getRenderTarget();
    renderer.getViewport(savedViewport);
    renderer.getScissor(savedScissor);
    const savedScissorTest = renderer.getScissorTest();

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, SIM_SIZE, SIM_SIZE);
    renderer.setRenderTarget(rtPrev);
    renderer.clearColor();
    renderer.setRenderTarget(rtCurr);
    renderer.clearColor();
    renderer.setRenderTarget(rtNext);
    renderer.clearColor();

    const seedDrop = (ux: number, uy: number, strength: number, steps: number) => {
      if (!simMat || !simScene || !simCamera || !rtPrev || !rtCurr || !rtNext) return;
      let prevRT: THREE.WebGLRenderTarget = rtPrev;
      let currRT: THREE.WebGLRenderTarget = rtCurr;
      let nextRT: THREE.WebGLRenderTarget = rtNext;
      simMat.uniforms.uDropPos.value.set(ux, uy);
      simMat.uniforms.uDropRadius.value = 0.026;
      for (let s = 0; s < steps; s++) {
        simMat.uniforms.uDropStrength.value = s === 0 ? strength : 0.0;
        simMat.uniforms.uCurr.value = currRT.texture;
        simMat.uniforms.uPrev.value = prevRT.texture;
        renderer.setRenderTarget(nextRT);
        renderer.render(simScene, simCamera);
        const oldPrev: THREE.WebGLRenderTarget = prevRT;
        prevRT = currRT;
        currRT = nextRT;
        nextRT = oldPrev;
      }
      rtPrev = prevRT;
      rtCurr = currRT;
      rtNext = nextRT;
    };

    seedDrop(0.62, 0.58, 0.62, 22);
    seedDrop(0.30, 0.34, 0.54, 14);
    seedDrop(0.48, 0.66, 0.46, 8);

    renderer.setRenderTarget(savedTarget);
    renderer.setViewport(savedViewport);
    renderer.setScissor(savedScissor);
    renderer.setScissorTest(savedScissorTest);
    simEnabled = true;
  }

  const geometry = new THREE.PlaneGeometry(2, 2);

  const uniforms = {
    uTime: { value: 0 },
    uAspect: { value: 16 / 9 },
    uIntensity: { value: params.intensity },
    uScrollProgress: { value: 0 },
    uLiquidMix: { value: 0 },
    uOceanMix: { value: 0 },
    uDarkMix: { value: targetDarkMix },
    uHasFbo: { value: simEnabled ? 1.0 : 0.0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uRippleTex: { value: rtCurr ? rtCurr.texture : dummyTex },
    uRippleTexel: { value: new THREE.Vector2(1 / SIM_SIZE, 1 / SIM_SIZE) },
    uObsidian: { value: new THREE.Color(params.obsidianColor) },
    uShineMid: { value: new THREE.Color(params.shineMidColor) },
    uShinePeak: { value: new THREE.Color(params.shinePeakColor) },
    uWaterDeepDark: { value: new THREE.Color(params.waterDeepDarkColor) },
    uMoonSpec: { value: new THREE.Color(params.moonSpecularColor) },
    uLightBase: { value: new THREE.Color(params.lightBaseColor) },
    uLightShadow: { value: new THREE.Color(params.lightShadowColor) },
    uLightPeak: { value: new THREE.Color(params.lightPeakColor) },
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
  let ambientDropTimer = 0.0;
  let simAccum = 0.0;

  const current = {
    pointerX: 0,
    pointerY: 0,
    liquidMix: 0,
    oceanMix: 0,
    darkMix: targetDarkMix,
  };

  const setTheme = (theme: 'dark' | 'light'): void => {
    targetDarkMix = theme === 'dark' ? 1.0 : 0.0;
  };

  const stepFbo = (dropU: number, dropV: number, dropStrength: number, dropRadius: number): void => {
    if (!simEnabled || !renderer || !simMat || !simScene || !simCamera || !rtPrev || !rtCurr || !rtNext) {
      return;
    }
    const savedTarget = renderer.getRenderTarget();
    renderer.getViewport(savedViewport);
    renderer.getScissor(savedScissor);
    const savedScissorTest = renderer.getScissorTest();

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, SIM_SIZE, SIM_SIZE);
    simMat.uniforms.uCurr.value = rtCurr.texture;
    simMat.uniforms.uPrev.value = rtPrev.texture;
    simMat.uniforms.uDropPos.value.set(dropU, dropV);
    simMat.uniforms.uDropRadius.value = dropRadius;
    simMat.uniforms.uDropStrength.value = dropStrength;

    renderer.setRenderTarget(rtNext);
    renderer.render(simScene, simCamera);

    const oldPrev = rtPrev;
    rtPrev = rtCurr;
    rtCurr = rtNext;
    rtNext = oldPrev;

    uniforms.uRippleTex.value = rtCurr.texture;

    renderer.setRenderTarget(savedTarget);
    renderer.setViewport(savedViewport);
    renderer.setScissor(savedScissor);
    renderer.setScissorTest(savedScissorTest);
  };

  const update = (
    time: number,
    scroll: ScrollState,
    viewport: { width: number; height: number },
    theme?: 'dark' | 'light'
  ): void => {
    const resolvedTheme = theme ?? scroll.theme;
    if (resolvedTheme !== undefined) {
      targetDarkMix = resolvedTheme === 'dark' ? 1.0 : 0.0;
    }

    const dt = prevTime > 0 ? Math.min(0.05, Math.max(0.001, time - prevTime)) : 0.016;
    prevTime = time;

    const aspect =
      viewport.height > 0 ? viewport.width / viewport.height : 16 / 9;

    // Fast, smooth Dark <-> Light theme convergence (14.0 rate settles in ~0.25s
    // even under slow software WebGL while remaining silky smooth at 60fps).
    if (resolvedTheme !== undefined) {
      current.darkMix += (targetDarkMix - current.darkMix) * (1 - Math.exp(-dt * 14.0));
      if (Math.abs(targetDarkMix - current.darkMix) < 0.005) {
        current.darkMix = targetDarkMix;
      }
    } else if (typeof scroll.darkMix === 'number') {
      current.darkMix = scroll.darkMix;
    } else {
      current.darkMix += (targetDarkMix - current.darkMix) * (1 - Math.exp(-dt * 14.0));
    }

    // Stage 2 (Beats 2 -> 3): progressively deeper capillary liquid presence
    const pOcean = Math.max(scroll.progress, scroll.rawProgress * 0.92);
    current.liquidMix = THREE.MathUtils.smoothstep(pOcean, 0.14, 0.60);

    // Stage 3 (Beat 4): smooth crossfade into the 3D perspective Gerstner ocean horizon
    current.oceanMix = THREE.MathUtils.smoothstep(pOcean, 0.64, 0.92);

    const targetPtrX = scroll.pointerX * params.parallaxStrength;
    const targetPtrY = -scroll.pointerY * params.parallaxStrength * 0.8;
    current.pointerX += (targetPtrX - current.pointerX) * 0.08;
    current.pointerY += (targetPtrY - current.pointerY) * 0.08;

    // Step the 256x256 ping-pong FBO wave-equation PDE at ~60Hz
    const ptrDelta = Math.hypot(scroll.pointerX - lastPtrX, scroll.pointerY - lastPtrY);
    lastPtrX = scroll.pointerX;
    lastPtrY = scroll.pointerY;

    if (simEnabled) {
      let dropU = scroll.pointerX * 0.5 + 0.5;
      let dropV = -scroll.pointerY * 0.5 + 0.5;
      let dropStrength = 0.0;
      let dropRadius = 0.024;

      if (ptrDelta > 0.003) {
        dropStrength = Math.min(0.75, ptrDelta * 5.8);
        dropRadius = 0.024 + Math.min(0.016, ptrDelta * 0.28);
        ambientDropTimer = 0.0;
      } else {
        ambientDropTimer += dt;
        if (ambientDropTimer > 1.35) {
          ambientDropTimer = 0.0;
          dropU = 0.5 + Math.sin(time * 0.77 + scroll.progress * 3.5) * 0.28;
          dropV = 0.5 + Math.cos(time * 0.59 - scroll.progress * 2.7) * 0.24;
          dropStrength = 0.52;
          dropRadius = 0.026;
        }
      }

      simAccum += dt;
      const fixedStep = 1 / 60;
      let subSteps = 0;
      while (simAccum >= fixedStep && subSteps < MAX_SIM_SUBSTEPS) {
        stepFbo(dropU, dropV, subSteps === 0 ? dropStrength : 0.0, dropRadius);
        simAccum -= fixedStep;
        subSteps++;
      }
      if (simAccum > fixedStep * 2) {
        simAccum = 0;
      }
      if (subSteps === 0 && dropStrength > 0.0) {
        stepFbo(dropU, dropV, dropStrength, dropRadius);
      }
    }

    uniforms.uTime.value = time;
    uniforms.uAspect.value = aspect;
    uniforms.uScrollProgress.value = scroll.progress;
    uniforms.uLiquidMix.value = current.liquidMix;
    uniforms.uOceanMix.value = current.oceanMix;
    uniforms.uDarkMix.value = current.darkMix;
    uniforms.uPointer.value.set(current.pointerX, current.pointerY);
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    dummyTex.dispose();
    rtPrev?.dispose();
    rtCurr?.dispose();
    rtNext?.dispose();
    simGeo?.dispose();
    simMat?.dispose();
  };

  return {
    mesh,
    update,
    setTheme,
    dispose,
  };
}
