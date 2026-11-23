import * as THREE from 'three';
import type { WordmarkCase } from './types';

/**
 * Editable configuration for the standalone 3D vertical wordmark part
 * wrapped onto both opposite sides of the sleek 12 fl oz crystal-clear PET can:
 * - Front side (0 deg): full-height vertical "BOCA"
 * - Back side (180 deg): full-height vertical "water"
 * Both sides render as tactile matte-satin die-cut vinyl stickers (`FrontSide`
 * so the rear sticker never ghosts or mirrors through the clear center).
 */
export interface BottleWordmarkMeshConfig {
  /** Radial offset above the outer PET wall to prevent z-fighting (world units) */
  radiusOffset: number;
  /** Vertical span of the curved decal as a fraction of bottleHeight */
  arcHeightFraction: number;
  /** Explicit arc height override in world units (null = derive from bottleHeight * arcHeightFraction) */
  arcHeight: number | null;
  /** Explicit horizontal arc angle in radians (null = auto 1:1 aspect match to 1024x2048 canvas) */
  arcAngle: number | null;
  /** Width-to-height ratio of the source wordmark canvas (1024 / 2048 = 0.5) */
  canvasAspect: number;
  /** Vertical offset relative to can mid-spine (world units) */
  yOffset: number;
  /** Circumferential placement angles in radians: [front (0 deg), back (180 deg)] */
  yawOffsets: readonly [number, number];
  /** Decal opacity (0..1) */
  opacity: number;
  /** Base print color */
  color: string;
  /** Tactile matte-satin vinyl sticker material tuning */
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
  sheen: number;
  sheenRoughness: number;
  emissiveIntensity: number;
  /** Optional emissive tint color (defaults to #ffffff; sunlit gold for sparkling flat gold) */
  emissiveColor?: string;
  /** Animated metallic micro-glitter sparkle intensity (0 = off, 1 = sparkling bright gold) */
  sparkleMix?: number;
}

export const BOTTLE_WORDMARK_MESH_CONFIG: BottleWordmarkMeshConfig = {
  radiusOffset: 0.0024,
  arcHeightFraction: 0.80,
  arcHeight: null,
  arcAngle: null,
  canvasAspect: 0.5,
  yOffset: -0.05,
  yawOffsets: [0, Math.PI],
  opacity: 0.96,
  color: '#ffffff',
  metalness: 0.08,
  roughness: 0.34,
  clearcoat: 0.48,
  clearcoatRoughness: 0.26,
  envMapIntensity: 1.55,
  sheen: 0.42,
  sheenRoughness: 0.40,
  emissiveIntensity: 0.14,
};

export type WordmarkSide = 'front' | 'back';

export interface BottleWordmarkPart {
  /** Parent group holding front ('BOCA' at 0 deg) & back ('water' at 180 deg) meshes */
  group: THREE.Group;
  /** Primary front-side curved decal mesh ('BOCA') */
  mesh: THREE.Mesh;
  /** Opposite back-side curved decal mesh ('water') */
  backMesh: THREE.Mesh;
  /** All decal side meshes [front, back] */
  meshes: [THREE.Mesh, THREE.Mesh];
  /** Shared cylindrical arc geometry (reused by 6-pack & 24-pack formations) */
  geometry: THREE.CylinderGeometry;
  /** Front-side matte-satin sticker material ('BOCA') */
  material: THREE.MeshPhysicalMaterial;
  /** Back-side matte-satin sticker material ('water') */
  backMaterial: THREE.MeshPhysicalMaterial;
  /** Swap or re-render both front ('BOCA') & back ('WATER') textures in place */
  updateTexture: (
    fontFamily: string,
    textCase?: WordmarkCase,
    externalCanvas?: HTMLCanvasElement | null,
    renderFn?: (fontFamily: string, textCase?: WordmarkCase) => HTMLCanvasElement,
    renderSideFn?: (
      side: WordmarkSide,
      fontFamily?: string,
      existingCanvas?: HTMLCanvasElement,
      color?: string
    ) => HTMLCanvasElement,
    inkColor?: string
  ) => void;
  /** Live-update opacity/roughness/finish/position overrides */
  applyConfig: (next: Partial<BottleWordmarkMeshConfig>) => void;
  /** Advance animated gold micro-glitter shimmer time (seconds) */
  setSparkleTime: (time: number) => void;
  /** Clean GPU disposal */
  dispose: () => void;
}

/**
 * Formats the Boca wordmark according to the active casing option.
 */
export function formatWordmarkText(textCase: WordmarkCase = 'upper'): string {
  if (textCase === 'upper') return 'BOCA';
  if (textCase === 'lower') return 'boca';
  return 'Boca';
}

const FALLBACK_PAIR_KERNING_EM: Record<string, number> = {
  BO: -0.018,
  OC: -0.014,
  CA: -0.022,
  Bo: -0.022,
  oc: -0.012,
  ca: -0.014,
  bo: -0.014,
  wa: -0.032,
  at: -0.018,
  te: -0.016,
  er: -0.014,
};

/**
 * High-DPI standalone fallback canvas renderer with tight luxury editorial kerning
 * spanning ~90% of vertical canvas height bottom-to-top.
 * Supports front ('BOCA') and back ('water') sides.
 */
export function createFallbackWordmarkCanvas(
  fontFamily = '"Instrument Serif", Georgia, serif',
  textCase: WordmarkCase = 'upper',
  color = BOTTLE_WORDMARK_MESH_CONFIG.color,
  side: WordmarkSide = 'front'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const word = side === 'back' ? 'WATER' : formatWordmarkText(textCase);
  const letterSpacingEm =
    side === 'back' ? -0.025 : textCase === 'upper' ? -0.025 : -0.045;

  // Measure at reference size then auto-fit cleanly to 90% of vertical canvas height
  const refSize = 400;
  ctx.font = `400 ${refSize}px ${fontFamily}`;

  const chars = word.split('');
  const measureTotal = (size: number) => {
    ctx.font = `400 ${size}px ${fontFamily}`;
    let total = 0;
    const advs: number[] = [];
    for (let i = 0; i < chars.length; i++) {
      let adv = ctx.measureText(chars[i]).width;
      if (i < chars.length - 1) {
        const pair = chars[i] + chars[i + 1];
        const pairEm = FALLBACK_PAIR_KERNING_EM[pair] ?? 0;
        adv += (letterSpacingEm + pairEm) * size;
      }
      advs.push(adv);
      total += adv;
    }
    return { total, advs };
  };

  const refMeasure = measureTotal(refSize);
  const targetSpan = canvas.height * 0.90;
  const fittedSize = Math.min(
    refSize * (targetSpan / Math.max(refMeasure.total, 1)),
    canvas.width * 0.84
  );
  const { total, advs } = measureTotal(fittedSize);

  ctx.save();
  // Centered on the cylindrical wall, rotated -90 deg so text runs UP bottom-to-top
  ctx.translate(canvas.width * 0.5, canvas.height * 0.5);
  ctx.rotate(-Math.PI / 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = `400 ${fittedSize}px ${fontFamily}`;

  let cursorX = -total * 0.5;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursorX, 0);
    cursorX += advs[i];
  }

  ctx.restore();
  return canvas;
}

interface SparkleUniforms {
  uSparkleTime: { value: number };
  uSparkleMix: { value: number };
}

function createStickerMaterial(
  tex: THREE.CanvasTexture,
  cfg: BottleWordmarkMeshConfig,
  sparkleUniforms: SparkleUniforms
): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex,
    color: new THREE.Color('#ffffff'),
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: tex,
    emissiveIntensity: cfg.emissiveIntensity,
    transparent: true,
    opacity: cfg.opacity,
    metalness: cfg.metalness,
    roughness: cfg.roughness,
    clearcoat: cfg.clearcoat,
    clearcoatRoughness: cfg.clearcoatRoughness,
    sheen: cfg.sheen,
    sheenRoughness: cfg.sheenRoughness,
    sheenColor: new THREE.Color('#f4f9ff'),
    envMapIntensity: cfg.envMapIntensity,
    side: THREE.FrontSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSparkleTime = sparkleUniforms.uSparkleTime;
    shader.uniforms.uSparkleMix = sparkleUniforms.uSparkleMix;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uSparkleTime;
        uniform float uSparkleMix;
        float bocaGoldHash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }`
      )
      .replace(
        '#include <dithering_fragment>',
        `if (uSparkleMix > 0.001) {
          vec2 gUv1 = vMapUv * vec2(135.0, 270.0);
          vec2 cell1 = floor(gUv1);
          vec2 local1 = fract(gUv1) - 0.5;
          float h1 = bocaGoldHash(cell1);
          float h1b = bocaGoldHash(cell1 + 19.37);

          vec2 gUv2 = vMapUv * vec2(250.0, 500.0);
          vec2 cell2 = floor(gUv2);
          vec2 local2 = fract(gUv2) - 0.5;
          float h2 = bocaGoldHash(cell2 + 73.11);
          float h2b = bocaGoldHash(cell2 + 41.7);

          vec3 vDir = normalize(vViewPosition);
          float anglePhase = dot(vDir.xy, vec2(7.5, 5.2));

          // Fine sunlit-gold glitter grain across the bright flat gold surface
          float grain = (h1 - 0.5) * 0.14 + (h2 - 0.5) * 0.08;
          gl_FragColor.rgb += vec3(1.0, 0.88, 0.44) * grain * uSparkleMix;

          // Twinkling pinpoint diamond-white & bright champagne micro-sparkles
          float tw1 = pow(max(0.0, sin(uSparkleTime * (2.6 + h1b * 3.8) + h1 * 62.83 + anglePhase)), 10.0);
          float dot1 = smoothstep(0.42, 0.04, length(local1));
          float spark1 = step(0.76, h1) * tw1 * dot1;

          float tw2 = pow(max(0.0, sin(uSparkleTime * (3.4 + h2b * 4.2) + h2 * 62.83 - anglePhase * 1.3)), 12.0);
          float dot2 = smoothstep(0.44, 0.05, length(local2));
          float spark2 = step(0.72, h2) * tw2 * dot2;

          vec3 diamondCol = vec3(1.0, 0.99, 0.90);
          vec3 goldGlintCol = vec3(1.0, 0.92, 0.56);
          gl_FragColor.rgb += (diamondCol * spark1 * 1.15 + goldGlintCol * spark2 * 0.95) * uSparkleMix;
        }
        #include <dithering_fragment>`
      );
  };
  mat.customProgramCacheKey = () => 'boca-wordmark-sparkle-v1';

  return mat;
}

export interface CreateBottleWordmarkPartOptions {
  bottleHeight: number;
  bodyRadius: number;
  wordmarkScale?: number;
  opacity?: number;
  color?: string;
  roughness?: number;
  configOverrides?: Partial<BottleWordmarkMeshConfig>;
}

/**
 * Builds the standalone 3D vertical wordmark part:
 * - Front (0 deg): full-height vertical "BOCA"
 * - Back (180 deg): full-height vertical "water"
 * Both sides use tactile matte-satin die-cut vinyl sticker materials with
 * FrontSide rendering so the rear sticker never ghosts through the clear center.
 */
export function createBottleWordmarkPart(
  options: CreateBottleWordmarkPartOptions
): BottleWordmarkPart {
  const cfg: BottleWordmarkMeshConfig = {
    ...BOTTLE_WORDMARK_MESH_CONFIG,
    ...(options.opacity !== undefined ? { opacity: options.opacity } : {}),
    ...(options.color !== undefined ? { color: options.color } : {}),
    ...(options.roughness !== undefined ? { roughness: options.roughness } : {}),
    ...options.configOverrides,
  };

  const scale = options.wordmarkScale ?? 1.0;
  const radius = options.bodyRadius + cfg.radiusOffset;
  const arcHeight =
    (cfg.arcHeight ?? options.bottleHeight * cfg.arcHeightFraction) * scale;
  const arcAngle =
    cfg.arcAngle ?? (arcHeight * cfg.canvasAspect) / Math.max(radius, 0.001);

  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    arcHeight,
    48,
    1,
    true,
    -arcAngle * 0.5,
    arcAngle
  );

  const makeTex = (canvas: HTMLCanvasElement) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  };

  let frontTex = makeTex(
    createFallbackWordmarkCanvas('"Instrument Serif", Georgia, serif', 'upper', cfg.color, 'front')
  );
  let backTex = makeTex(
    createFallbackWordmarkCanvas('"Instrument Serif", Georgia, serif', 'lower', cfg.color, 'back')
  );

  const sparkleUniforms: SparkleUniforms = {
    uSparkleTime: { value: 0 },
    uSparkleMix: { value: cfg.sparkleMix ?? 0 },
  };

  const frontMaterial = createStickerMaterial(frontTex, cfg, sparkleUniforms);
  const backMaterial = createStickerMaterial(backTex, cfg, sparkleUniforms);

  const group = new THREE.Group();
  group.name = 'BocaWordmarkStickerPart';

  const frontMesh = new THREE.Mesh(geometry, frontMaterial);
  frontMesh.name = 'BocaVerticalWordmarkFront';
  frontMesh.position.y = cfg.yOffset;
  frontMesh.rotation.y = cfg.yawOffsets[0];
  frontMesh.renderOrder = 6;
  group.add(frontMesh);

  const backMesh = new THREE.Mesh(geometry, backMaterial);
  backMesh.name = 'BocaVerticalWordmarkBack';
  backMesh.position.y = cfg.yOffset;
  backMesh.rotation.y = cfg.yawOffsets[1];
  backMesh.renderOrder = 6;
  group.add(backMesh);

  const updateTexture = (
    fontFamily: string,
    textCase: WordmarkCase = 'upper',
    externalCanvas?: HTMLCanvasElement | null,
    renderFn?: (fontFamily: string, textCase?: WordmarkCase) => HTMLCanvasElement,
    renderSideFn?: (
      side: WordmarkSide,
      fontFamily?: string,
      existingCanvas?: HTMLCanvasElement,
      color?: string
    ) => HTMLCanvasElement,
    inkColor?: string
  ) => {
    const resolvedColor = inkColor ?? cfg.color;
    const nextFrontCanvas =
      externalCanvas ??
      (renderSideFn
        ? renderSideFn('front', fontFamily, undefined, inkColor)
        : renderFn
          ? renderFn(fontFamily, textCase)
          : createFallbackWordmarkCanvas(fontFamily, textCase, resolvedColor, 'front'));

    const nextBackCanvas = renderSideFn
      ? renderSideFn('back', fontFamily, undefined, inkColor)
      : createFallbackWordmarkCanvas(fontFamily, 'upper', resolvedColor, 'back');

    const nextFrontTex = makeTex(nextFrontCanvas);
    frontMaterial.map = nextFrontTex;
    frontMaterial.emissiveMap = nextFrontTex;
    frontMaterial.needsUpdate = true;
    frontTex.dispose();
    frontTex = nextFrontTex;

    const nextBackTex = makeTex(nextBackCanvas);
    backMaterial.map = nextBackTex;
    backMaterial.emissiveMap = nextBackTex;
    backMaterial.needsUpdate = true;
    backTex.dispose();
    backTex = nextBackTex;
  };

  const applyConfig = (next: Partial<BottleWordmarkMeshConfig>) => {
    Object.assign(cfg, next);
    for (const mat of [frontMaterial, backMaterial]) {
      mat.color.set(cfg.color);
      mat.emissive.set(cfg.emissiveColor ?? '#ffffff');
      mat.opacity = cfg.opacity;
      mat.metalness = cfg.metalness;
      mat.roughness = cfg.roughness;
      mat.clearcoat = cfg.clearcoat;
      mat.clearcoatRoughness = cfg.clearcoatRoughness;
      mat.sheen = cfg.sheen;
      mat.sheenRoughness = cfg.sheenRoughness;
      mat.envMapIntensity = cfg.envMapIntensity;
      mat.emissiveIntensity = cfg.emissiveIntensity;
      mat.needsUpdate = true;
    }
    if (next.sparkleMix !== undefined) {
      sparkleUniforms.uSparkleMix.value = next.sparkleMix;
    }
    frontMesh.position.y = cfg.yOffset;
    backMesh.position.y = cfg.yOffset;
    frontMesh.rotation.y = cfg.yawOffsets[0];
    backMesh.rotation.y = cfg.yawOffsets[1];
  };

  const setSparkleTime = (time: number) => {
    sparkleUniforms.uSparkleTime.value = time;
  };

  const dispose = () => {
    geometry.dispose();
    frontMaterial.dispose();
    backMaterial.dispose();
    frontTex.dispose();
    backTex.dispose();
  };

  return {
    group,
    mesh: frontMesh,
    backMesh,
    meshes: [frontMesh, backMesh],
    geometry,
    material: frontMaterial,
    backMaterial,
    updateTexture,
    applyConfig,
    setSparkleTime,
    dispose,
  };
}
