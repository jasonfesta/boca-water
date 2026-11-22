import * as THREE from 'three';
import {
  BOTTLE_WORDMARK_MESH_CONFIG,
  createBottleWordmarkPart,
  createFallbackWordmarkCanvas as createDefaultWordmarkCanvas,
  formatWordmarkText,
  type BottleWordmarkPart,
} from './bottleWordmarkMesh';
import {
  DEFAULT_BOTTLE_TUNE_PARAMS,
  type BottleTuneParams,
  type PackMode,
  type ScrollState,
  type WordmarkCase,
} from './types';

export {
  BOTTLE_WORDMARK_MESH_CONFIG,
  createBottleWordmarkPart,
  createDefaultWordmarkCanvas,
  formatWordmarkText,
  type BottleWordmarkPart,
};

export interface BottleSharedResources {
  outerGeo: THREE.BufferGeometry;
  lidGeo: THREE.BufferGeometry;
  wordmarkGeo: THREE.BufferGeometry;
  petOuterMaterial: THREE.MeshPhysicalMaterial;
  fresnelRimMaterial: THREE.ShaderMaterial;
  clearLidMaterial: THREE.MeshPhysicalMaterial;
  clearDetailMaterial: THREE.MeshPhysicalMaterial;
  wordmarkMaterial: THREE.MeshPhysicalMaterial;
  wordmarkBackMaterial: THREE.MeshPhysicalMaterial;
  bottleHeight: number;
  bodyRadius: number;
  waterFillLevel: number;
}

export interface BottleAssembly {
  /** Root group containing the sleek 12oz crystal-clear PET can, clear pull-tab lid, and vertical wordmark */
  group: THREE.Group;
  /** Crystal-clear seamed lid & pull-tab sub-group */
  capGroup: THREE.Group;
  /** Outer crystal-clear PET shell mesh */
  outerShell: THREE.Mesh;
  /** Inner specular PET wall & thick domed base punt mesh */
  innerShell: THREE.Mesh;
  /** Curved cylindrical vertical wordmark mesh ("Boca" / "BOCA" / "boca") */
  wordmarkMesh: THREE.Mesh;
  /** Shared geometries & materials for zero-overhead 6-pack / 24-pack formations */
  sharedResources: BottleSharedResources;
  /** Vessel vertical bounds in local coordinates */
  bounds: {
    baseY: number;
    topY: number;
    bodyStartY: number;
    bodyEndY: number;
    shoulderEndY: number;
    waterMaxY: number;
    bodyRadius: number;
    innerRadius: number;
  };
  /** Update the vertical wordmark textures (front 'BOCA' & back 'water') when font or case changes */
  updateWordmark: (
    fontFamily: string,
    textCase?: WordmarkCase,
    externalCanvas?: HTMLCanvasElement | null,
    renderFn?: (fontFamily: string, textCase?: WordmarkCase) => HTMLCanvasElement,
    renderSideFn?: (side: 'front' | 'back', fontFamily?: string) => HTMLCanvasElement
  ) => void;
  /** Live-update physical PET tuning parameters */
  applyTuneParams: (params: Partial<BottleTuneParams>) => void;
  /** Dispose all geometries, materials, and procedural textures */
  dispose: () => void;
}

/**
 * Generates a procedural 128x128 chilled micro-droplet DataTexture normal map
 * (adapted from wda/coastal-drive/src/scene/car/materials.ts) so the crystal-clear
 * PET outer clearcoat catches authentic chilled-surface micro-beading speculars.
 */
function createChilledDropletNormalMap(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);

  // Neutral tangent-space normal (0, 0, 1) -> (128, 128, 255)
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = 128;
    data[i * 4 + 1] = 128;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }

  let seed = 424242;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Scatter subtle chilled condensation micro-beads across the clearcoat normal map
  const dropletCount = 190;
  for (let d = 0; d < dropletCount; d++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const radius = 1.2 + Math.pow(rand(), 2.2) * 3.4;
    const strength = 0.45 + rand() * 0.45;
    const rCeil = Math.ceil(radius);

    for (let dy = -rCeil; dy <= rCeil; dy++) {
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        const distSq = dx * dx + dy * dy;
        const rSq = radius * radius;
        if (distSq >= rSq) continue;

        const px = ((Math.floor(cx) + dx) % size + size) % size;
        const py = ((Math.floor(cy) + dy) % size + size) % size;
        const nx = (dx / radius) * strength;
        const ny = (dy / radius) * strength;
        const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));

        const idx = (py * size + px) * 4;
        data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 6);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a subtle procedural bump map simulating real chilled blow-molded
 * PET plastic micro-texture (faint axial stretch + delicate chilled sheen).
 */
function createPetMicroSurfaceTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Subtle vertical blow-mold flow lines
    for (let x = 0; x < size; x += 2) {
      const v = 125 + Math.sin(x * 0.25) * 4 + Math.cos(x * 0.68) * 2.5;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, 0, 2, size);
    }

    // Ultra-fine chilled PET micro-grain
    const img = ctx.getImageData(0, 0, size, size);
    const data = img.data;
    let seed = 202611;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < data.length; i += 4) {
      const n = (rand() - 0.5) * 8;
      const val = Math.max(0, Math.min(255, data[i] + n));
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(img, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the sleek 12 fl oz (355mL) crystal-clear PET beverage can outer wall profile
 * from the standing contact chime around the rounded hemispherical heel, straight
 * cylindrical body, and short crisp neck-in taper.
 * (The smooth molded base punt dome is built separately without polar UV normal-map
 * singularities so bottom macro renders with zero heart/V-pinch.)
 */
function buildOuterCanProfile(params: BottleTuneParams): THREE.Vector2[] {
  const H = params.bottleHeight;
  const R = params.bodyRadius;
  const Rn = params.neckRadius;
  const baseY = -H * 0.5;

  const pts: THREE.Vector2[] = [];
  const push = (r: number, yNorm: number) => {
    pts.push(new THREE.Vector2(Math.max(0, r), baseY + yNorm * H));
  };

  // Start cleanly at the flat standing contact chime
  push(R * 0.56, 0.0005);
  push(R * 0.61, 0.0);
  push(R * 0.65, 0.0012);

  // Smoothly rounded hemispherical PET heel (18 smooth arc steps for macro perfection)
  const heelSteps = 18;
  const heelStartR = R * 0.65;
  const heelEndY = 0.102;
  for (let i = 1; i <= heelSteps; i++) {
    const t = i / heelSteps;
    const angle = (t * Math.PI) / 2;
    const r = THREE.MathUtils.lerp(heelStartR, R, Math.sin(angle));
    const y = THREE.MathUtils.lerp(0.0012, heelEndY, 1 - Math.cos(angle));
    push(r, y);
  }

  // Straight sleek cylindrical PET body
  push(R, 0.30);
  push(R * 0.9995, 0.55);
  push(R, 0.892);

  // Short, crisp beverage-can neck-in taper (12 smooth steps)
  const neckStartY = 0.892;
  const neckEndY = 0.960;
  const neckSteps = 12;
  for (let i = 1; i <= neckSteps; i++) {
    const t = i / neckSteps;
    const ease = t * t * (3 - 2 * t);
    const r = THREE.MathUtils.lerp(R, Rn, ease);
    const y = THREE.MathUtils.lerp(neckStartY, neckEndY, t);
    push(r, y);
  }

  // Tuck cleanly into the clear seamed lid skirt (zero Z-fighting with lidShell)
  push(Rn * 0.99, 0.964);

  return pts;
}

/**
 * Builds the smooth, shallow injection-molded clear PET base punt dome (matching
 * Orka reference photo #1) with exact parabolic dy/dr = 0 at center and zero
 * normal/bump-map polar UV singularity.
 */
function buildBasePuntDomeProfile(params: BottleTuneParams): THREE.Vector2[] {
  const H = params.bottleHeight;
  const R = params.bodyRadius;
  const baseY = -H * 0.5;
  const pts: THREE.Vector2[] = [];

  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = R * 0.565 * t;
    const dome = 1 - t * t;
    // Gentle, realistic molded PET punt depth (0.044H) matching Orka photo #1
    const y = baseY + 0.044 * dome * dome * H;
    pts.push(new THREE.Vector2(r, y));
  }
  return pts;
}

/**
 * Builds the inner PET wall + thicker optical base dome cavity so the rounded
 * hemispherical heel shows real molded PET wall thickness and luminous refractions.
 */
function buildInnerCanProfile(params: BottleTuneParams): THREE.Vector2[] {
  const H = params.bottleHeight;
  const R = params.bodyRadius - params.wallThickness;
  const Rn = params.neckRadius - params.wallThickness * 0.9;
  const baseY = -H * 0.5;

  const pts: THREE.Vector2[] = [];
  const push = (r: number, yNorm: number) => {
    pts.push(new THREE.Vector2(Math.max(0.001, r), baseY + yNorm * H));
  };

  // Thicker optical base punt interior (smooth 14-point parabolic dome, dy/dr = 0 at center)
  const innerPuntSteps = 14;
  for (let i = 0; i <= innerPuntSteps; i++) {
    const t = i / innerPuntSteps;
    const r = R * 0.62 * t;
    const dome = 1 - t * t;
    const y = 0.032 + 0.048 * dome * dome;
    push(r, y);
  }
  push(R * 0.78, 0.036);
  push(R * 0.92, 0.056);
  push(R * 0.98, 0.082);
  push(R, 0.110);

  // Straight inner cylindrical wall
  push(R, 0.895);

  // Inner neck-in taper
  const neckSteps = 6;
  for (let i = 1; i <= neckSteps; i++) {
    const t = i / neckSteps;
    const ease = t * t * (3 - 2 * t);
    push(
      THREE.MathUtils.lerp(R, Rn, ease),
      THREE.MathUtils.lerp(0.895, 0.962, t)
    );
  }

  return pts;
}

/**
 * Builds the high-resolution crystal-clear PET / acrylic seamed beverage can lid profile:
 * smooth double-rolled outer seam chime, clean countersink groove, subtle deck bead,
 * and flat recessed lid deck (zero jagged transitions or floating ring primitives).
 */
function buildClearCanLidProfile(params: BottleTuneParams): THREE.Vector2[] {
  const H = params.bottleHeight;
  const Rc = params.capRadius;
  const baseY = -H * 0.5;

  const pts: THREE.Vector2[] = [];
  const push = (r: number, yNorm: number) => {
    pts.push(new THREE.Vector2(Math.max(0.0005, r), baseY + yNorm * H));
  };

  // Smooth double-rolled outer seam chime (circular arc crest)
  push(Rc * 0.955, 0.958);
  push(Rc * 0.988, 0.961);
  push(Rc * 1.008, 0.968);
  push(Rc * 1.014, 0.978);
  push(Rc * 1.012, 0.988);
  push(Rc * 1.002, 0.995);
  push(Rc * 0.986, 0.9995);
  push(Rc * 0.968, 1.000); // Smooth top crest of rolled seam
  push(Rc * 0.948, 0.997);
  push(Rc * 0.932, 0.990);

  // Smooth countersink wall descending into the recessed lid valley
  push(Rc * 0.922, 0.978);
  push(Rc * 0.908, 0.971);
  push(Rc * 0.888, 0.9685); // Smooth countersink valley floor
  push(Rc * 0.864, 0.9705);
  push(Rc * 0.842, 0.9745); // Subtle inner chuck-wall bead step
  push(Rc * 0.810, 0.9765);
  push(Rc * 0.720, 0.9772);
  push(Rc * 0.420, 0.9775);
  push(0.0005, 0.9775);

  return pts;
}

/**
 * Builds the sculpted crystal-clear PET / acrylic pull-tab with finger loop cutout,
 * raised bevel rim, central clear rivet, and scored drink-opening contour.
 */
function buildClearPullTabGroup(
  params: BottleTuneParams,
  lidMaterial: THREE.Material,
  detailMaterial: THREE.Material
): THREE.Group {
  const H = params.bottleHeight;
  const Rc = params.capRadius;
  const baseY = -H * 0.5;
  const deckY = baseY + H * 0.978;

  const tabGroup = new THREE.Group();
  tabGroup.name = 'ClearPullTabAssembly';

  // 1. Extruded crystal-clear rounded-pill pull-tab with finger hole
  const tabW = Rc * 0.56;
  const tabL = Rc * 0.98;
  const rCorner = tabW * 0.44;

  const outerShape = new THREE.Shape();
  const hw = tabW * 0.5;
  const hl = tabL * 0.5;
  outerShape.moveTo(-hw + rCorner, -hl);
  outerShape.lineTo(hw - rCorner, -hl);
  outerShape.quadraticCurveTo(hw, -hl, hw, -hl + rCorner);
  outerShape.lineTo(hw, hl - rCorner);
  outerShape.quadraticCurveTo(hw, hl, hw - rCorner, hl);
  outerShape.lineTo(-hw + rCorner, hl);
  outerShape.quadraticCurveTo(-hw, hl, -hw, hl - rCorner);
  outerShape.lineTo(-hw, -hl + rCorner);
  outerShape.quadraticCurveTo(-hw, -hl, -hw + rCorner, -hl);

  // Rear finger-lift cutout hole
  const fingerHole = new THREE.Path();
  fingerHole.absellipse(0, -hl * 0.36, hw * 0.58, hl * 0.36, 0, Math.PI * 2, true, 0);
  outerShape.holes.push(fingerHole);

  // Front rivet-slot cutout
  const frontHole = new THREE.Path();
  frontHole.absellipse(0, hl * 0.36, hw * 0.36, hl * 0.18, 0, Math.PI * 2, true, 0);
  outerShape.holes.push(frontHole);

  const tabGeo = new THREE.ExtrudeGeometry(outerShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.0055,
    bevelSize: 0.0055,
    bevelSegments: 5,
    curveSegments: 36,
  });
  tabGeo.rotateX(-Math.PI / 2);

  const tabMesh = new THREE.Mesh(tabGeo, lidMaterial);
  tabMesh.name = 'ClearPullTab';
  // Seated cleanly flush on the sunken lid deck
  tabMesh.position.set(0, deckY + 0.005, -Rc * 0.08);
  tabMesh.renderOrder = 5;
  tabGroup.add(tabMesh);

  // 2. Central crystal-clear rivet button smoothly pinning the pull-tab
  const rivetGeo = new THREE.CylinderGeometry(
    Rc * 0.068,
    Rc * 0.082,
    0.018,
    32
  );
  const rivetMesh = new THREE.Mesh(rivetGeo, detailMaterial);
  rivetMesh.name = 'ClearTabRivet';
  rivetMesh.position.set(0, deckY + 0.009, Rc * 0.05);
  rivetMesh.renderOrder = 5;
  tabGroup.add(rivetMesh);

  // 3. Delicate embossed scored drink-opening contour flush on the clear lid deck
  const scoreGeo = new THREE.TorusGeometry(Rc * 0.24, 0.0022, 12, 48);
  scoreGeo.rotateX(Math.PI / 2);
  scoreGeo.scale(0.86, 1.0, 1.18);
  const scoreMesh = new THREE.Mesh(scoreGeo, detailMaterial);
  scoreMesh.name = 'ClearScoredAperture';
  scoreMesh.position.set(0, deckY + 0.0008, Rc * 0.42);
  scoreMesh.renderOrder = 4;
  tabGroup.add(scoreMesh);

  return tabGroup;
}

/**
 * Constructs the complete procedural Boca Water sleek 12 fl oz (355mL)
 * crystal-clear PET beverage can assembly.
 */
export function createBottleAssembly(
  overrides?: Partial<BottleTuneParams>
): BottleAssembly {
  const params: BottleTuneParams = {
    ...DEFAULT_BOTTLE_TUNE_PARAMS,
    ...overrides,
  };

  const H = params.bottleHeight;
  const R = params.bodyRadius;
  const baseY = -H * 0.5;

  const group = new THREE.Group();
  group.name = 'BocaCanRoot';

  const microTex = createPetMicroSurfaceTexture();
  const dropletNormalTex = createChilledDropletNormalMap();

  // 1. Primary Outer Crystal-Clear PET Plastic Material (NOT glass)
  // Tuned with coastal-drive chilled micro-droplet clearcoat normal map + PET IOR 1.57
  const petOuterMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 1.0,
    transmission: params.petTransmission,
    ior: params.petIor,
    thickness: params.petThickness,
    roughness: 0.056,
    metalness: 0.0,
    clearcoat: 0.92,
    clearcoatRoughness: 0.068,
    clearcoatNormalMap: dropletNormalTex,
    clearcoatNormalScale: new THREE.Vector2(0.06, 0.06),
    specularIntensity: 1.15,
    specularColor: new THREE.Color('#ffffff'),
    envMapIntensity: 1.18,
    attenuationDistance: params.petAttenuationDistance,
    attenuationColor: new THREE.Color(params.petAttenuationColor),
    bumpMap: microTex,
    bumpScale: 0.0005,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  // 2. Inner PET Wall & Thick Domed Base Punt Refraction Material
  // Strictly zero envMap reflection on inner wall to prevent ghost "straw/tube" columns
  // while keeping subtle optical thickness around the rounded heel and domed base punt.
  const petInnerMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#dcebf7'),
    transparent: true,
    opacity: 0.025,
    roughness: 0.35,
    metalness: 0.0,
    ior: params.petIor,
    reflectivity: 0.05,
    clearcoat: 0.0,
    envMapIntensity: 0.0,
    side: THREE.BackSide,
    depthWrite: false,
  });

  // 3. Crystal-Clear PET / Acrylic Seamed Lid Material
  // Optical transparent acrylic (no screen-space transmission artifacts on tight 90-deg
  // countersink folds; lets the sparkling water & teardrop pocket shine right through
  // while the rolled double-seam chime catches crisp studio speculars).
  const clearLidMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#eef6fc'),
    transparent: true,
    opacity: 0.22,
    roughness: 0.06,
    metalness: 0.04,
    ior: params.capIor,
    reflectivity: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.045,
    specularIntensity: 1.15,
    specularColor: new THREE.Color('#ffffff'),
    envMapIntensity: 1.15,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  // Sculpted crystal-clear acrylic pull-tab material (clear glossy bevels, not frosted white)
  const clearPullTabMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e8f3fc'),
    transparent: true,
    opacity: 0.32,
    roughness: 0.075,
    metalness: 0.04,
    ior: params.capIor,
    reflectivity: 0.92,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.35,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  // Delicate translucent detail material for clear rivet & flush scored drink aperture
  const clearDetailMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e6f2fa'),
    transparent: true,
    opacity: 0.24,
    roughness: 0.1,
    metalness: 0.02,
    ior: params.capIor,
    clearcoat: 0.85,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.1,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  // Build Outer Sleek PET Can Shell (128 radial segments for zero faceting in top/bottom macro)
  const outerGeo = new THREE.LatheGeometry(buildOuterCanProfile(params), 128);
  outerGeo.computeVertexNormals();
  const outerShell = new THREE.Mesh(outerGeo, petOuterMaterial);
  outerShell.name = 'PetOuterShell';
  outerShell.renderOrder = 3;
  group.add(outerShell);

  // Smooth glossy injection-molded clear PET base punt dome (zero bump/normal-map polar singularity!)
  const puntDomeGeo = new THREE.LatheGeometry(buildBasePuntDomeProfile(params), 96);
  puntDomeGeo.computeVertexNormals();
  {
    const posAttr = puntDomeGeo.attributes.position;
    const normAttr = puntDomeGeo.attributes.normal;
    for (let i = 0; i < posAttr.count; i++) {
      if (Math.hypot(posAttr.getX(i), posAttr.getZ(i)) < 0.015) {
        normAttr.setXYZ(i, 0, -1, 0);
      }
    }
    normAttr.needsUpdate = true;
  }
  const petPuntMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#eef5fb'),
    transparent: true,
    opacity: 0.20,
    roughness: 0.06,
    metalness: 0.02,
    ior: params.petIor,
    reflectivity: 0.85,
    clearcoat: 0.9,
    clearcoatRoughness: 0.05,
    envMapIntensity: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const puntDomeMesh = new THREE.Mesh(puntDomeGeo, petPuntMaterial);
  puntDomeMesh.name = 'PetBasePuntDome';
  puntDomeMesh.renderOrder = 3;
  group.add(puntDomeMesh);

  // Dark-Field Bright-Rim Fresnel Optical Layer:
  // Reproduces classic dark-field studio bright-rim photography (razor-sharp white
  // left/right silhouette outlines on pure black while keeping center crystal-clear dark).
  const fresnelRimMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uRimColor: { value: new THREE.Color('#f6faff') },
      uRimPower: { value: 4.6 },
      uRimStrength: { value: 1.24 },
      uBaseY: { value: baseY },
      uBodyRadius: { value: R },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uRimColor;
      uniform float uRimPower;
      uniform float uRimStrength;
      uniform float uBaseY;
      uniform float uBodyRadius;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;
      void main() {
        float ndotv = clamp(abs(dot(normalize(vNormalView), normalize(vViewDir))), 0.0, 1.0);
        // Razor-sharp dark-field grazing rim (strictly zero fill in center)
        float fresnel = pow(1.0 - ndotv, uRimPower);
        float sideBias = 0.35 + 0.65 * pow(abs(normalize(vNormalView).x), 1.4);
        // Mask out the recessed underside punt dome interior so it never paints a hard white triangle
        float radialNorm = length(vLocalPos.xz) / max(uBodyRadius, 0.001);
        float isUndersidePunt = (1.0 - smoothstep(uBaseY + 0.02, uBaseY + 0.18, vLocalPos.y))
          * (1.0 - smoothstep(0.54, 0.66, radialNorm));
        float puntMask = 1.0 - isUndersidePunt * 0.92;
        float alpha = clamp(fresnel * sideBias * uRimStrength * puntMask, 0.0, 0.96);
        gl_FragColor = vec4(uRimColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });

  const fresnelRimMesh = new THREE.Mesh(outerGeo, fresnelRimMaterial);
  fresnelRimMesh.name = 'PetDarkFieldFresnelRim';
  fresnelRimMesh.scale.setScalar(1.0012);
  fresnelRimMesh.renderOrder = 4;
  group.add(fresnelRimMesh);

  // Build Inner PET Cavity & Thick Molded Base Punt Dome (96 smooth segments, welded pole normals)
  const innerGeo = new THREE.LatheGeometry(buildInnerCanProfile(params), 96);
  innerGeo.computeVertexNormals();
  {
    const posAttr = innerGeo.attributes.position;
    const normAttr = innerGeo.attributes.normal;
    for (let i = 0; i < posAttr.count; i++) {
      const rx = posAttr.getX(i);
      const rz = posAttr.getZ(i);
      const py = posAttr.getY(i);
      if (Math.hypot(rx, rz) < 0.015 && py < 0) {
        normAttr.setXYZ(i, 0, 1, 0);
      }
    }
    normAttr.needsUpdate = true;
  }
  const innerShell = new THREE.Mesh(innerGeo, petInnerMaterial);
  innerShell.name = 'PetInnerWall';
  innerShell.renderOrder = 2;
  group.add(innerShell);

  // Build Completely Crystal-Clear PET Seamed Lid + Pull-Tab Group (112 segments)
  const capGroup = new THREE.Group();
  capGroup.name = 'ClearPetLidGroup';

  const lidGeo = new THREE.LatheGeometry(buildClearCanLidProfile(params), 112);
  lidGeo.computeVertexNormals();
  const lidShell = new THREE.Mesh(lidGeo, clearLidMaterial);
  lidShell.name = 'ClearLidShell';
  lidShell.renderOrder = 4;
  capGroup.add(lidShell);

  // Subtle physical Fresnel specular overlay directly on the rolled clear seam lid
  // (replaces the old synthetic floating torus ring with true curved rim specular)
  const lidRimMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#f4f9ff') },
    },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(vV);
        float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
        float rim = pow(1.0 - ndv, 3.6);
        vec3 L1 = normalize(vec3(0.55, 0.78, 0.35));
        vec3 L2 = normalize(vec3(-0.65, 0.65, 0.25));
        float spec = pow(max(dot(reflect(-L1, N), V), 0.0), 36.0) * 0.72
                   + pow(max(dot(reflect(-L2, N), V), 0.0), 28.0) * 0.45;
        float alpha = clamp(rim * 0.68 + spec, 0.0, 0.88);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const lidRimMesh = new THREE.Mesh(lidGeo, lidRimMaterial);
  lidRimMesh.name = 'ClearLidFresnelRim';
  lidRimMesh.scale.setScalar(1.0008);
  lidRimMesh.renderOrder = 5;
  capGroup.add(lidRimMesh);

  const pullTabGroup = buildClearPullTabGroup(
    params,
    clearPullTabMaterial,
    clearDetailMaterial
  );
  capGroup.add(pullTabGroup);

  group.add(capGroup);

  // 4. Standalone Vertical Serif Wordmark Part (both opposite sides: 0 deg & 180 deg,
  // tactile matte-satin die-cut vinyl sticker — editable in bottleWordmarkMesh.ts)
  const wordmarkPart = createBottleWordmarkPart({
    bottleHeight: H,
    bodyRadius: R,
    wordmarkScale: params.wordmarkScale,
    opacity: params.wordmarkOpacity,
    color: params.wordmarkColor,
    roughness: BOTTLE_WORDMARK_MESH_CONFIG.roughness,
  });
  group.add(wordmarkPart.group);

  const wordmarkGeo = wordmarkPart.geometry;
  const wordmarkMaterial = wordmarkPart.material;
  const wordmarkBackMaterial = wordmarkPart.backMaterial;
  const wordmarkMesh = wordmarkPart.mesh;

  const updateWordmark = (
    fontFamily: string,
    textCase: WordmarkCase = 'upper',
    externalCanvas?: HTMLCanvasElement | null,
    renderFn?: (fontFamily: string, textCase?: WordmarkCase) => HTMLCanvasElement,
    renderSideFn?: (side: 'front' | 'back', fontFamily?: string) => HTMLCanvasElement
  ) => {
    wordmarkPart.updateTexture(
      fontFamily,
      textCase,
      externalCanvas,
      renderFn,
      renderSideFn
    );
  };

  const applyTuneParams = (next: Partial<BottleTuneParams>) => {
    Object.assign(params, next);

    petOuterMaterial.ior = params.petIor;
    petOuterMaterial.transmission = params.petTransmission;
    petOuterMaterial.thickness = params.petThickness;
    petOuterMaterial.roughness = params.petRoughness;
    petOuterMaterial.clearcoat = params.petClearcoat;
    petOuterMaterial.clearcoatRoughness = params.petClearcoatRoughness;
    petOuterMaterial.specularIntensity = params.petSpecularIntensity;
    petOuterMaterial.envMapIntensity = params.petEnvMapIntensity;
    petOuterMaterial.attenuationDistance = params.petAttenuationDistance;
    petOuterMaterial.attenuationColor.set(params.petAttenuationColor);
    petOuterMaterial.needsUpdate = true;

    clearLidMaterial.ior = params.capIor;
    clearLidMaterial.transmission = params.capTransmission;
    clearLidMaterial.roughness = params.capRoughness;
    clearLidMaterial.clearcoat = params.capClearcoat;
    clearLidMaterial.needsUpdate = true;

    wordmarkPart.applyConfig({
      opacity: params.wordmarkOpacity,
    });
  };

  const dispose = () => {
    outerGeo.dispose();
    puntDomeGeo.dispose();
    innerGeo.dispose();
    lidGeo.dispose();
    pullTabGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry.dispose();
      }
    });

    petOuterMaterial.dispose();
    petPuntMaterial.dispose();
    fresnelRimMaterial.dispose();
    petInnerMaterial.dispose();
    clearLidMaterial.dispose();
    clearPullTabMaterial.dispose();
    lidRimMaterial.dispose();
    clearDetailMaterial.dispose();
    wordmarkPart.dispose();

    microTex.dispose();
    dropletNormalTex.dispose();
  };

  return {
    group,
    capGroup,
    outerShell,
    innerShell,
    wordmarkMesh,
    sharedResources: {
      outerGeo,
      lidGeo,
      wordmarkGeo,
      petOuterMaterial,
      fresnelRimMaterial,
      clearLidMaterial,
      clearDetailMaterial,
      wordmarkMaterial,
      wordmarkBackMaterial,
      bottleHeight: H,
      bodyRadius: R,
      waterFillLevel: params.waterFillLevel,
    },
    bounds: {
      baseY,
      topY: baseY + H,
      bodyStartY: baseY + H * 0.098,
      bodyEndY: baseY + H * 0.895,
      shoulderEndY: baseY + H * 0.962,
      waterMaxY: baseY + H * params.waterFillLevel,
      bodyRadius: R,
      innerRadius: R - params.wallThickness,
    },
    updateWordmark,
    applyTuneParams,
    dispose,
  };
}

interface PackSlotSpring {
  meshGroup: THREE.Group | null; // null for index 0 (hero can offset)
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Vector3;
  rotVel: THREE.Vector3;
  scale: number;
  scaleVel: number;
  stiffness: number;
  damping: number;
  phase: number;
}

export interface PackFormationManager {
  /** Group holding the 23 lightweight satellite cans (added as sibling/child under pack pivot) */
  group: THREE.Group;
  /** Spring-animated local offset applied to the hero can (slot 0) when in 6-pack / 24-pack */
  readonly heroOffset: THREE.Vector3;
  /** Spring-animated local rotation applied to the hero can (slot 0) when expanded */
  readonly heroRotOffset: THREE.Vector3;
  /** Update all 24 spring-driven can slots per frame */
  update: (
    time: number,
    dt: number,
    packMode: PackMode,
    packExpanded: boolean,
    scroll: ScrollState
  ) => void;
  /** Dispose only the extra meniscus ring geometry/material owned by the pack manager */
  dispose: () => void;
}

/**
 * Computes target local position, rotation, and scale for can slot `idx` (0..23)
 * in '1-pack' (solo), '6-pack' (tight sculptural 2x3 cluster), or '24-pack'
 * (2 stacked architectural tiers of 4x3 = 12 cans each, punt-to-lid, zero box).
 */
function computePackSlotTarget(
  idx: number,
  packMode: PackMode,
  packExpanded: boolean,
  bottleHeight: number,
  outPos: THREE.Vector3,
  outRot: THREE.Vector3
): number {
  if (packMode === '1-pack') {
    outPos.set(0, 0, 0);
    outRot.set(0, 0, 0);
    return idx === 0 ? 1 : 0;
  }

  if (packMode === '6-pack') {
    if (idx >= 6) {
      outPos.set(0, -0.15, 0);
      outRot.set(0, 0, 0);
      return 0;
    }
    // Tight sculptural 2x3 cluster (3 cols x 2 depth rows, zero carrier/box)
    const cols = 3;
    const rows = 2;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const nx = col - (cols - 1) * 0.5; // -1, 0, +1
    const nz = row - (rows - 1) * 0.5; // -0.5, +0.5

    const spacingX = packExpanded ? 1.38 : 0.89;
    const spacingZ = packExpanded ? 1.28 : 0.89;
    const puffY = packExpanded
      ? (row === 0 ? 0.14 : -0.12) + (1 - Math.abs(nx)) * 0.12
      : 0;

    outPos.set(nx * spacingX, puffY, nz * spacingZ);
    if (packExpanded) {
      outRot.set(nz * 0.19, nx * 0.22, -nx * 0.15);
    } else {
      outRot.set(0, 0, 0);
    }
    return 1;
  }

  // '24-pack': 2 stacked vertical tiers of 12 cans (4 cols x 3 depth rows x 2 layers)
  // Resting cleanly punt-to-lid when compact; lifting & breathing apart vertically when expanded.
  const cols = 4;
  const rows = 3;
  const perTier = cols * rows; // 12
  const tier = Math.floor(idx / perTier); // 0 = bottom tier, 1 = top tier
  const tierIdx = idx % perTier;
  const col = tierIdx % cols;
  const row = Math.floor(tierIdx / cols);

  const nx = col - (cols - 1) * 0.5; // -1.5, -0.5, +0.5, +1.5
  const nz = row - (rows - 1) * 0.5; // -1, 0, +1

  const spacingX = packExpanded ? 1.18 : 0.89;
  const spacingZ = packExpanded ? 1.12 : 0.89;

  // Compact: exact punt-to-lid stack centered around y = 0 (-0.5H and +0.5H)
  // Expanded: upper and lower tiers lift apart cleanly (+0.26H floating gap) with subtle radial breath
  const tierHalfGap = packExpanded ? bottleHeight * 0.63 : bottleHeight * 0.502;
  const tierY = tier === 0 ? -tierHalfGap : tierHalfGap;
  const radialWaveY = packExpanded
    ? (tier === 1 ? 1 : -1) * (0.06 * Math.hypot(nx, nz))
    : 0;

  outPos.set(nx * spacingX, tierY + radialWaveY, nz * spacingZ);
  if (packExpanded) {
    outRot.set(
      nz * 0.08 + (tier === 1 ? -0.04 : 0.04),
      nx * 0.08,
      -nx * 0.065
    );
  } else {
    outRot.set(0, 0, 0);
  }
  return 1;
}

/**
 * Builds a lightweight, 60fps 3D pack formation manager supporting 1-pack,
 * 6-pack (2x3), and 24-pack (4x6) formations that puff/unravel outward in 3D
 * with staggered 2nd-order spring physics and pointer-reactive micro-oscillation.
 */
export function createPackFormationManager(
  hero: BottleAssembly
): PackFormationManager {
  const res = hero.sharedResources;
  const H = res.bottleHeight;
  const baseY = -H * 0.5;

  const group = new THREE.Group();
  group.name = 'BocaPackFormation';

  // Shared lightweight meniscus highlight ring for satellite cans
  const miniMeniscusGeo = new THREE.TorusGeometry(
    res.bodyRadius * 0.89,
    0.0044,
    10,
    48
  );
  miniMeniscusGeo.rotateX(Math.PI / 2);
  const miniMeniscusMat = new THREE.MeshBasicMaterial({
    color: 0xe6f4ff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });

  const slots: PackSlotSpring[] = [];

  for (let i = 0; i < 24; i++) {
    let canGroup: THREE.Group | null = null;
    if (i > 0) {
      canGroup = new THREE.Group();
      canGroup.name = `BocaPackCan_${i}`;
      canGroup.visible = false;

      const outer = new THREE.Mesh(res.outerGeo, res.petOuterMaterial);
      outer.renderOrder = 3;
      canGroup.add(outer);

      const rim = new THREE.Mesh(res.outerGeo, res.fresnelRimMaterial);
      rim.scale.setScalar(1.0012);
      rim.renderOrder = 4;
      canGroup.add(rim);

      const lid = new THREE.Mesh(res.lidGeo, res.clearLidMaterial);
      lid.renderOrder = 4;
      canGroup.add(lid);

      const meniscus = new THREE.Mesh(miniMeniscusGeo, miniMeniscusMat);
      meniscus.position.y = baseY + H * res.waterFillLevel;
      meniscus.renderOrder = 2;
      canGroup.add(meniscus);

      const frontSticker = new THREE.Mesh(res.wordmarkGeo, res.wordmarkMaterial);
      frontSticker.position.y = BOTTLE_WORDMARK_MESH_CONFIG.yOffset;
      frontSticker.rotation.y = BOTTLE_WORDMARK_MESH_CONFIG.yawOffsets[0];
      frontSticker.renderOrder = 6;
      canGroup.add(frontSticker);

      const backSticker = new THREE.Mesh(res.wordmarkGeo, res.wordmarkBackMaterial);
      backSticker.position.y = BOTTLE_WORDMARK_MESH_CONFIG.yOffset;
      backSticker.rotation.y = BOTTLE_WORDMARK_MESH_CONFIG.yawOffsets[1];
      backSticker.renderOrder = 6;
      canGroup.add(backSticker);

      group.add(canGroup);
    }

    // Staggered spring parameters so outer cans wave/bloom organically on puff-out
    const ringOrder = i % 6;
    slots.push({
      meshGroup: canGroup,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Vector3(),
      rotVel: new THREE.Vector3(),
      scale: i === 0 ? 1 : 0,
      scaleVel: 0,
      stiffness: 42 - ringOrder * 2.2,
      damping: 9.2 - ringOrder * 0.25,
      phase: i * 0.47,
    });
  }

  const targetPos = new THREE.Vector3();
  const targetRot = new THREE.Vector3();

  const update = (
    time: number,
    dt: number,
    packMode: PackMode,
    packExpanded: boolean,
    scroll: ScrollState
  ) => {
    const clampedDt = Math.min(Math.max(dt, 0.001), 0.04);

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const targetScale = computePackSlotTarget(
        i,
        packMode,
        packExpanded,
        H,
        targetPos,
        targetRot
      );

      // Subtle pointer-reactive harmonic wave & micro-oscillation across the pack
      const isMulti = packMode !== '1-pack' && targetScale > 0.5;
      if (isMulti) {
        const wave =
          Math.sin(time * 1.6 + slot.phase + scroll.pointerX * 1.4) *
          (packExpanded ? 0.042 : 0.012);
        targetPos.y += wave;
        targetRot.x += scroll.pointerY * (packExpanded ? 0.09 : 0.035);
        targetRot.z -= scroll.pointerX * (packExpanded ? 0.08 : 0.03);
      }

      // 2nd-order damped spring integration (position, rotation, scale)
      const k = slot.stiffness;
      const d = slot.damping;

      slot.vel.x += ((targetPos.x - slot.pos.x) * k - slot.vel.x * d) * clampedDt;
      slot.vel.y += ((targetPos.y - slot.pos.y) * k - slot.vel.y * d) * clampedDt;
      slot.vel.z += ((targetPos.z - slot.pos.z) * k - slot.vel.z * d) * clampedDt;
      slot.pos.addScaledVector(slot.vel, clampedDt);

      slot.rotVel.x +=
        ((targetRot.x - slot.rot.x) * k - slot.rotVel.x * d) * clampedDt;
      slot.rotVel.y +=
        ((targetRot.y - slot.rot.y) * k - slot.rotVel.y * d) * clampedDt;
      slot.rotVel.z +=
        ((targetRot.z - slot.rot.z) * k - slot.rotVel.z * d) * clampedDt;
      slot.rot.addScaledVector(slot.rotVel, clampedDt);

      const sAccel = (targetScale - slot.scale) * (k * 1.15) - slot.scaleVel * d;
      slot.scaleVel += sAccel * clampedDt;
      slot.scale = Math.max(0, slot.scale + slot.scaleVel * clampedDt);

      if (slot.meshGroup) {
        const visible = slot.scale > 0.015;
        slot.meshGroup.visible = visible;
        if (visible) {
          slot.meshGroup.position.copy(slot.pos);
          slot.meshGroup.rotation.set(slot.rot.x, slot.rot.y, slot.rot.z);
          slot.meshGroup.scale.setScalar(slot.scale);
        }
      }
    }
  };

  const dispose = () => {
    miniMeniscusGeo.dispose();
    miniMeniscusMat.dispose();
  };

  return {
    group,
    heroOffset: slots[0].pos,
    heroRotOffset: slots[0].rot,
    update,
    dispose,
  };
}
