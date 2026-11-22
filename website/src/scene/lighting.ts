import * as THREE from 'three';
import type {
  BottleLightingRig,
  BottleScrollSection,
  LightingOptions,
  LightingPreset,
  ScrollState,
} from './types';

/**
 * Orbs-3D-derived Feathered HDR Studio Cyclorama + Grazing Clear-PET Rim Rig.
 * Combines the exact procedural Float32 studio cyclorama & 3-point lighting
 * craft from wda/history-of-orbs-3d with razor-sharp grazing rear-side bright
 * rims for the crystal-clear 12 fl oz PET beverage can & sparkling water.
 * Strictly zero purple/violet hues and zero yellow cast on the clear water.
 */
export interface LightingPresetConfig {
  /** Primary upper-left studio key light (Orbs 3D gallery key) */
  keyColor: string;
  keyIntensity: number;
  /** Opposite cool-silver studio fill (prevents dead black crush, adds 3D wrap) */
  fillColor: string;
  fillIntensity: number;
  /** Grazing rear-right bright-rim edge light */
  rimRightColor: string;
  rimRightIntensity: number;
  /** Grazing rear-left bright-rim edge light */
  rimLeftColor: string;
  rimLeftIntensity: number;
  /** Rear-grazing sparkling water bubble & teardrop meniscus caustic light */
  causticColor: string;
  causticIntensity: number;
  /** Overhead clear seamed lid, pull-tab & headspace meniscus spotlight */
  capSpotColor: string;
  capSpotIntensity: number;
  /** Low upward accent for thick clear domed PET base punt */
  puntColor: string;
  puntIntensity: number;
  /** Balanced gallery hemisphere ambient */
  hemiSkyColor: string;
  hemiGroundColor: string;
  hemiIntensity: number;
  /** Recommended scene.environmentIntensity multiplier */
  envIntensity: number;
}

export const LIGHTING_PRESETS: Record<LightingPreset, LightingPresetConfig> = {
  'studio-dark': {
    keyColor: '#fffcf7',
    keyIntensity: 2.75,
    fillColor: '#dceaf2',
    fillIntensity: 0.14,
    rimRightColor: '#ffffff',
    rimRightIntensity: 4.75,
    rimLeftColor: '#f0f7ff',
    rimLeftIntensity: 4.15,
    causticColor: '#ffffff',
    causticIntensity: 3.1,
    capSpotColor: '#ffffff',
    capSpotIntensity: 3.35,
    puntColor: '#f4f9ff',
    puntIntensity: 1.85,
    hemiSkyColor: '#a6b2be',
    hemiGroundColor: '#030304',
    hemiIntensity: 0.05,
    envIntensity: 1.22,
  },
  'ice-rim': {
    keyColor: '#f5faff',
    keyIntensity: 2.25,
    fillColor: '#cfe6f7',
    fillIntensity: 0.65,
    rimRightColor: '#daf0ff',
    rimRightIntensity: 4.85,
    rimLeftColor: '#e0f3ff',
    rimLeftIntensity: 4.2,
    causticColor: '#e8f7ff',
    causticIntensity: 3.55,
    capSpotColor: '#f6fbff',
    capSpotIntensity: 3.35,
    puntColor: '#dff2ff',
    puntIntensity: 1.9,
    hemiSkyColor: '#a9c8de',
    hemiGroundColor: '#06080b',
    hemiIntensity: 0.16,
    envIntensity: 1.55,
  },
  'dramatic-edge': {
    keyColor: '#ffffff',
    keyIntensity: 1.95,
    fillColor: '#c8d6e2',
    fillIntensity: 0.32,
    rimRightColor: '#ffffff',
    rimRightIntensity: 5.25,
    rimLeftColor: '#ffffff',
    rimLeftIntensity: 4.65,
    causticColor: '#ffffff',
    causticIntensity: 3.25,
    capSpotColor: '#ffffff',
    capSpotIntensity: 3.5,
    puntColor: '#ffffff',
    puntIntensity: 1.8,
    hemiSkyColor: '#98a4b0',
    hemiGroundColor: '#040405',
    hemiIntensity: 0.08,
    envIntensity: 1.42,
  },
};

interface ChapterLightModifiers {
  keyMul: number;
  fillMul: number;
  rimMul: number;
  causticMul: number;
  capSpotMul: number;
  puntMul: number;
  sweepOffset: number;
}

const CHAPTER_LIGHT_MODS: Record<BottleScrollSection, ChapterLightModifiers> = {
  hero: {
    keyMul: 1.0,
    fillMul: 1.0,
    rimMul: 1.05,
    causticMul: 1.0,
    capSpotMul: 0.98,
    puntMul: 1.05,
    sweepOffset: 0.0,
  },
  silhouette: {
    keyMul: 0.95,
    fillMul: 0.92,
    rimMul: 1.24,
    causticMul: 0.96,
    capSpotMul: 1.05,
    puntMul: 1.12,
    sweepOffset: 0.34,
  },
  bubbles: {
    keyMul: 1.04,
    fillMul: 1.05,
    rimMul: 1.12,
    causticMul: 1.48,
    capSpotMul: 0.92,
    puntMul: 1.0,
    sweepOffset: 0.72,
  },
  cap: {
    keyMul: 1.08,
    fillMul: 1.0,
    rimMul: 1.16,
    causticMul: 0.94,
    capSpotMul: 1.62,
    puntMul: 0.8,
    sweepOffset: 1.14,
  },
  pack: {
    keyMul: 1.12,
    fillMul: 1.15,
    rimMul: 1.04,
    causticMul: 1.0,
    capSpotMul: 1.1,
    puntMul: 1.12,
    sweepOffset: 1.52,
  },
};

/**
 * Generates a 1024x512 Float32 HDR Feathered Studio Cyclorama environment map
 * lifted directly from wda/history-of-orbs-3d/src/main.ts (`createStudioHdrEnv`)
 * and augmented with razor-sharp grazing rear-side bright-rim strips (±142° & ±160°)
 * so the crystal-clear 12 fl oz PET can combines:
 *   1. Orbs 3D's lush, silky, feathered overhead silk-scrim dome & equatorial
 *      negative-fill contrast (dimensional reflections, never dead black).
 *   2. Razor-crisp bilateral white contour ribbons strictly along the outer
 *      silhouette edges (zero inner ghost tubes behind the vertical BOCA wordmark).
 *   3. High-radiance rear-upper sparkle lobes for refractive water & condensation.
 */
export function buildStudioScrimEnvMap(
  renderer: THREE.WebGLRenderer,
  envIntensityMultiplier = 1.0
): THREE.Texture {
  const W = 1024;
  const H = 512;
  const data = new Float32Array(W * H * 4);
  const scale = Math.max(0.25, envIntensityMultiplier);

  for (let y = 0; y < H; y++) {
    // Invert Three.js equirectUv (DataTexture flipY = false: y=0 -> v=0 -> bottom -Y, y=H -> top +Y)
    const v = (y + 0.5) / H;
    const lat = (v - 0.5) * Math.PI; // -PI/2 (bottom) .. +PI/2 (zenith)
    const cosLat = Math.cos(lat);
    const dy = Math.sin(lat);

    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      // Invert Three.js equirectUv: u = atan(dz, dx) / (2*PI) + 0.5
      // -> u = 0.75 is +Z (camera front), u = 0.25 is -Z (behind can)
      const phi = (u - 0.5) * Math.PI * 2;
      const dx = cosLat * Math.cos(phi);
      const dz = cosLat * Math.sin(phi);

      // 1. Deeper, moodier obsidian studio cyclorama base gradient (~42% darker)
      const sky = Math.max(0, dy);
      const floor = Math.max(0, -dy);
      let r = 0.025 + sky * 0.14 + floor * 0.04;
      let g = 0.026 + sky * 0.145 + floor * 0.042;
      let b = 0.030 + sky * 0.16 + floor * 0.048;

      // 2. Broad, silky feathered overhead silk-scrim dome (strictly zenith dy > 0.55)
      // Illuminates the clear rolled seamed lid, pull-tab, and top teardrop air-pocket
      // with ZERO vertical bleed onto the front cylindrical side wall.
      const overhead = Math.exp(-Math.pow((1 - dy) * 2.75, 2.0));
      r += overhead * 2.15;
      g += overhead * 2.15;
      b += overhead * 2.18;

      // 3. Strictly overhead-zenith feathered key softbox (dy >= 0.85)
      const kDot = Math.max(0, dx * -0.26 + dy * 0.95 + dz * 0.17);
      const zenithGate = Math.pow(Math.max(0, dy), 4.0);
      const keySoft = (Math.pow(kDot, 14.0) * 2.15 + Math.pow(kDot, 48.0) * 1.75) * zenithGate;
      r += keySoft * 1.02;
      g += keySoft * 1.01;
      b += keySoft * 1.0;

      // 4. Crisp back-top kicker rim (clear seamed lid separation against deep obsidian)
      const rDot = Math.max(0, dx * 0.22 + dy * 0.58 + dz * -0.78);
      const rimTop = Math.pow(rDot, 16.0) * 3.5;
      r += rimTop;
      g += rimTop;
      b += rimTop * 1.03;

      // 5. Razor-sharp grazing rear-side vertical bright-rim strips (±141° & ±160° off +Z)
      const azFromFront = Math.atan2(Math.abs(dx), dz); // 0 = front (+Z), PI = direct back (-Z)
      const verticalEnv = Math.exp(-Math.pow(dy * 1.15, 4.0));

      const mainRim =
        Math.exp(-Math.pow((azFromFront - 2.46) / 0.085, 2.0)) * 9.2 * verticalEnv; // ~141°
      const outerRim =
        Math.exp(-Math.pow((azFromFront - 2.79) / 0.070, 2.0)) * 7.0 * verticalEnv; // ~160°

      // 6. Low under-punt caustic bounce (ignites thick clear domed PET base punt)
      const pDot = Math.max(0, dx * 0.0 + dy * -0.58 + dz * -0.81);
      const puntRim = Math.pow(pDot, 14.0) * 3.4;

      // 7. Strict front-hemisphere equatorial negative-fill curtain (-110°..+110°)
      // Eliminates ANY vertical "inner straw/tube" reflection bars across the front
      // cylinder wall behind BOCA so the center stays pure crystal-clear dark-field.
      const frontMask = Math.max(0, 1.0 - Math.pow(Math.max(0, (azFromFront - 1.75) / 0.38), 2.0));
      const eqDark = Math.exp(-Math.pow(dy * 1.85, 4.0)) * 0.96 * frontMask;
      r *= 1 - eqDark;
      g *= 1 - eqDark;
      b *= 1 - eqDark;

      // Add crisp grazing rim strips & under-punt caustic after front negative-fill
      const rimTotal = mainRim + outerRim + puntRim;
      r = (r + rimTotal) * scale;
      g = (g + rimTotal) * scale;
      b = (b + rimTotal * 1.01) * scale;

      const idx = (y * W + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 1.0;
    }
  }

  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  // Save renderer state before PMREM generation (required in Three.js r155+)
  const prevTarget = renderer.getRenderTarget();
  const prevViewport = new THREE.Vector4();
  const prevScissor = new THREE.Vector4();
  renderer.getViewport(prevViewport);
  renderer.getScissor(prevScissor);
  const prevScissorTest = renderer.getScissorTest();

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const renderTarget = pmrem.fromEquirectangular(tex);

  // Restore renderer state immediately
  renderer.setRenderTarget(prevTarget);
  renderer.setViewport(prevViewport);
  renderer.setScissor(prevScissor);
  renderer.setScissorTest(prevScissorTest);

  tex.dispose();
  pmrem.dispose();

  return renderTarget.texture;
}

/**
 * Creates the Boca Water Orbs-inspired dark-mode 3D studio lighting rig +
 * procedural Float32 HDR feathered cyclorama environment map.
 */
export function createLightingRig(
  renderer: THREE.WebGLRenderer,
  options: LightingOptions = {}
): BottleLightingRig {
  let activePreset: LightingPreset = options.preset ?? 'studio-dark';
  const baseKeyScale = options.keyIntensity ?? 1.0;
  const baseRimScale = options.rimIntensity ?? 1.0;
  const baseEnvScale = options.envIntensity ?? 1.0;

  const presetCfg = LIGHTING_PRESETS[activePreset];
  const envMap = buildStudioScrimEnvMap(renderer, baseEnvScale);

  const group = new THREE.Group();
  group.name = 'BocaStudioLightingRig';

  // 1. Primary Studio Key Light (Orbs 3D upper-left gallery key)
  const keyLight = new THREE.DirectionalLight(
    presetCfg.keyColor,
    presetCfg.keyIntensity * baseKeyScale
  );
  keyLight.position.set(-3.2, 4.4, 4.2);
  keyLight.name = 'StudioKeyLight';
  group.add(keyLight);

  // 2. Opposite Cool-Silver Studio Fill Light (Orbs 3D 3-point wrap)
  const fillLight = new THREE.DirectionalLight(
    presetCfg.fillColor,
    presetCfg.fillIntensity
  );
  fillLight.position.set(4.0, 1.0, 2.5);
  fillLight.name = 'StudioFillLight';
  group.add(fillLight);

  // 3. Grazing Rear-Right Bright-Rim Light
  const rimRight = new THREE.DirectionalLight(
    presetCfg.rimRightColor,
    presetCfg.rimRightIntensity * baseRimScale
  );
  rimRight.position.set(5.2, 1.8, -3.8);
  rimRight.name = 'StudioRimRight';
  group.add(rimRight);

  // 4. Grazing Rear-Left Counter Bright-Rim Light
  const rimLeft = new THREE.DirectionalLight(
    presetCfg.rimLeftColor,
    presetCfg.rimLeftIntensity * baseRimScale
  );
  rimLeft.position.set(-5.2, 1.5, -3.9);
  rimLeft.name = 'StudioRimLeft';
  group.add(rimLeft);

  // 5. Rear-Grazing Sparkling Water Bubble & Meniscus Caustic Light
  const causticLight = new THREE.PointLight(
    presetCfg.causticColor,
    presetCfg.causticIntensity,
    16.0,
    1.6
  );
  causticLight.position.set(1.6, 0.55, -2.2);
  causticLight.name = 'SparklingCausticLight';
  group.add(causticLight);

  // 6. Overhead Clear Seamed Lid, Pull-Tab & Teardrop Air-Pocket Spotlight
  const capSpot = new THREE.SpotLight(
    presetCfg.capSpotColor,
    presetCfg.capSpotIntensity,
    14.0,
    Math.PI / 7.2,
    0.58,
    1.7
  );
  capSpot.position.set(0.35, 4.9, 1.55);
  capSpot.target.position.set(0, 1.02, 0);
  capSpot.name = 'ClearLidSpotLight';
  group.add(capSpot);
  group.add(capSpot.target);

  // 7. Low Upward Clear-Punt Accent Light (sculpts thick domed PET base)
  const puntLight = new THREE.PointLight(
    presetCfg.puntColor,
    presetCfg.puntIntensity * baseRimScale,
    6.2,
    2.0
  );
  puntLight.position.set(-0.45, -1.55, -1.25);
  puntLight.name = 'ClearPuntBounceLight';
  group.add(puntLight);

  // 8. Balanced Dark-Gallery Hemisphere Ambient
  const hemiLight = new THREE.HemisphereLight(
    presetCfg.hemiSkyColor,
    presetCfg.hemiGroundColor,
    presetCfg.hemiIntensity
  );
  hemiLight.name = 'StudioHemiFill';
  group.add(hemiLight);

  const state = {
    keyMul: 1.0,
    fillMul: 1.0,
    rimMul: 1.05,
    causticMul: 1.0,
    capSpotMul: 0.98,
    puntMul: 1.05,
    packSpread: 0.0,
    sweepAngle: 0.0,
    pointerX: 0.0,
    pointerY: 0.0,
  };

  const targetColors = {
    key: new THREE.Color(presetCfg.keyColor),
    fill: new THREE.Color(presetCfg.fillColor),
    rimRight: new THREE.Color(presetCfg.rimRightColor),
    rimLeft: new THREE.Color(presetCfg.rimLeftColor),
    caustic: new THREE.Color(presetCfg.causticColor),
    capSpot: new THREE.Color(presetCfg.capSpotColor),
    punt: new THREE.Color(presetCfg.puntColor),
    hemiSky: new THREE.Color(presetCfg.hemiSkyColor),
    hemiGround: new THREE.Color(presetCfg.hemiGroundColor),
  };

  const setPreset = (preset: LightingPreset): void => {
    if (!LIGHTING_PRESETS[preset]) return;
    activePreset = preset;
    const cfg = LIGHTING_PRESETS[preset];
    targetColors.key.set(cfg.keyColor);
    targetColors.fill.set(cfg.fillColor);
    targetColors.rimRight.set(cfg.rimRightColor);
    targetColors.rimLeft.set(cfg.rimLeftColor);
    targetColors.caustic.set(cfg.causticColor);
    targetColors.capSpot.set(cfg.capSpotColor);
    targetColors.punt.set(cfg.puntColor);
    targetColors.hemiSky.set(cfg.hemiSkyColor);
    targetColors.hemiGround.set(cfg.hemiGroundColor);
  };

  const update = (time: number, scroll: ScrollState): void => {
    const cfg = LIGHTING_PRESETS[activePreset];
    const mod = CHAPTER_LIGHT_MODS[scroll.section] ?? CHAPTER_LIGHT_MODS.hero;
    const damp = 0.075;

    state.keyMul += (mod.keyMul - state.keyMul) * damp;
    state.fillMul += (mod.fillMul - state.fillMul) * damp;
    state.rimMul += (mod.rimMul - state.rimMul) * damp;
    state.causticMul += (mod.causticMul - state.causticMul) * damp;
    state.capSpotMul += (mod.capSpotMul - state.capSpotMul) * damp;
    state.puntMul += (mod.puntMul - state.puntMul) * damp;

    const targetPackSpread = scroll.section === 'pack' ? 1.0 : 0.0;
    state.packSpread += (targetPackSpread - state.packSpread) * damp;

    const desiredSweep =
      mod.sweepOffset + scroll.progress * 0.8 + Math.sin(time * 0.35) * 0.05;
    state.sweepAngle += (desiredSweep - state.sweepAngle) * 0.08;

    state.pointerX += (scroll.pointerX - state.pointerX) * 0.08;
    state.pointerY += (scroll.pointerY - state.pointerY) * 0.08;

    const velocityBoost = Math.min(0.45, Math.abs(scroll.velocity) * 0.35);

    keyLight.color.lerp(targetColors.key, 0.1);
    fillLight.color.lerp(targetColors.fill, 0.1);
    rimRight.color.lerp(targetColors.rimRight, 0.1);
    rimLeft.color.lerp(targetColors.rimLeft, 0.1);
    causticLight.color.lerp(targetColors.caustic, 0.1);
    capSpot.color.lerp(targetColors.capSpot, 0.1);
    puntLight.color.lerp(targetColors.punt, 0.1);
    hemiLight.color.lerp(targetColors.hemiSky, 0.1);
    hemiLight.groundColor.lerp(targetColors.hemiGround, 0.1);

    keyLight.intensity = cfg.keyIntensity * baseKeyScale * state.keyMul;
    fillLight.intensity = cfg.fillIntensity * state.fillMul;
    rimRight.intensity = cfg.rimRightIntensity * baseRimScale * state.rimMul;
    rimLeft.intensity = cfg.rimLeftIntensity * baseRimScale * state.rimMul;
    causticLight.intensity =
      cfg.causticIntensity * (state.causticMul + velocityBoost);
    capSpot.intensity = cfg.capSpotIntensity * state.capSpotMul;
    puntLight.intensity = cfg.puntIntensity * baseRimScale * state.puntMul;
    hemiLight.intensity = cfg.hemiIntensity;

    // Steeper overhead key illuminates the matte-satin BOCA wordmark & clear lid
    // cleanly without painting a specular vertical bar down the front cylinder wall.
    const keyAzimuth = -0.35 + state.sweepAngle * 0.16 + state.pointerX * 0.22;
    const keyRadius = 4.2;
    keyLight.position.set(
      Math.sin(keyAzimuth) * keyRadius,
      5.6 - state.pointerY * 0.45,
      Math.cos(keyAzimuth) * keyRadius
    );

    // Subtle counter-breathing grazing rim lights
    const rimOrbit = state.sweepAngle * 0.16 - state.pointerX * 0.14;
    rimRight.position.set(
      Math.cos(0.58 + rimOrbit) * 6.2,
      1.75 + Math.sin(time * 0.38) * 0.14,
      -Math.sin(0.58 + rimOrbit) * 6.2
    );
    rimLeft.position.set(
      -Math.cos(0.58 - rimOrbit) * 6.2,
      1.5 + Math.cos(time * 0.34) * 0.14,
      -Math.sin(0.58 - rimOrbit) * 6.2
    );

    // Rear-grazing sparkling caustic light (zero front-wall glare pill)
    const causticAngle = time * 0.45 + scroll.progress * Math.PI * 1.2;
    const causticRadius = 2.4 + state.packSpread * 1.6;
    causticLight.position.set(
      Math.sin(causticAngle) * causticRadius,
      0.55 + Math.sin(time * 0.72) * 0.35,
      -1.85 - Math.abs(Math.cos(causticAngle)) * 1.15
    );

    // Widen overhead spotlight cone & height in 'pack' chapter for 6-pack & 2-tier 24-pack
    capSpot.angle =
      Math.PI / 7.2 + state.packSpread * (Math.PI / 2.4 - Math.PI / 7.2);
    capSpot.position.set(
      0.35 + state.pointerX * 0.5,
      4.9 + state.packSpread * 3.2,
      1.55 + state.packSpread * 1.8 - state.pointerY * 0.35
    );

    puntLight.distance = 6.2 + state.packSpread * 8.0;
    puntLight.position.set(
      -0.45 + state.pointerX * 0.3,
      -1.55 - state.packSpread * 0.6,
      -1.25 - state.packSpread * 0.8
    );
  };

  const dispose = (): void => {
    envMap.dispose();
    group.clear();
  };

  return {
    group,
    envMap,
    update,
    setPreset,
    dispose,
  };
}
