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
  /** Swap or re-render both front ('BOCA') & back ('water') textures in place */
  updateTexture: (
    fontFamily: string,
    textCase?: WordmarkCase,
    externalCanvas?: HTMLCanvasElement | null,
    renderFn?: (fontFamily: string, textCase?: WordmarkCase) => HTMLCanvasElement,
    renderSideFn?: (side: WordmarkSide, fontFamily?: string) => HTMLCanvasElement
  ) => void;
  /** Live-update opacity/roughness/finish/position overrides */
  applyConfig: (next: Partial<BottleWordmarkMeshConfig>) => void;
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

  const word = side === 'back' ? 'water' : formatWordmarkText(textCase);
  const letterSpacingEm =
    side === 'back' ? -0.038 : textCase === 'upper' ? -0.025 : -0.045;

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

function createStickerMaterial(
  tex: THREE.CanvasTexture,
  cfg: BottleWordmarkMeshConfig
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
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

  const frontMaterial = createStickerMaterial(frontTex, cfg);
  const backMaterial = createStickerMaterial(backTex, cfg);

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
    renderSideFn?: (side: WordmarkSide, fontFamily?: string) => HTMLCanvasElement
  ) => {
    const nextFrontCanvas =
      externalCanvas ??
      (renderSideFn
        ? renderSideFn('front', fontFamily)
        : renderFn
          ? renderFn(fontFamily, textCase)
          : createFallbackWordmarkCanvas(fontFamily, textCase, cfg.color, 'front'));

    const nextBackCanvas = renderSideFn
      ? renderSideFn('back', fontFamily)
      : createFallbackWordmarkCanvas(fontFamily, 'lower', cfg.color, 'back');

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
    frontMesh.position.y = cfg.yOffset;
    backMesh.position.y = cfg.yOffset;
    frontMesh.rotation.y = cfg.yawOffsets[0];
    backMesh.rotation.y = cfg.yawOffsets[1];
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
    dispose,
  };
}
