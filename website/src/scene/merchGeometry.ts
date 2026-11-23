import * as THREE from 'three';

/**
 * Museum-grade procedural 3D BOCA WATER luxury apparel sculptures
 * (Heavyweight Boxy Tee, Sleek Low-Profile 6-Panel Cap, Heavyweight Pullover Hoodie)
 * engineered for the expanded Shop 6-item 3D showcase.
 *
 * Sculpted with continuous curved-spine shoulder-to-sleeve lofts, low-profile dad-cap
 * proportions with tone-on-tone panel bevels, folded cowl pullover hood, embossed
 * kangaroo pocket, and live Light / Dark / Bright Sparkling Flat Gold adaptation.
 */

export interface MerchMaterialSet {
  fabric: THREE.MeshPhysicalMaterial;
  rib: THREE.MeshPhysicalMaterial;
  underVisor: THREE.MeshPhysicalMaterial;
  seam: THREE.MeshStandardMaterial;
  cavity: THREE.MeshStandardMaterial;
  metal: THREE.MeshPhysicalMaterial;
  emblem: THREE.MeshPhysicalMaterial;
  textures: THREE.Texture[];
}

export interface MerchTrioHandle {
  shirtGroup: THREE.Group;
  hatGroup: THREE.Group;
  hoodieGroup: THREE.Group;
  /** Update fabric, hardware & BOCA emblem materials live for Light, Dark, and Bright Sparkling Gold modes */
  updateMerchMaterials: (isDark: boolean, isGold: boolean) => void;
  /** Cleanly dispose all geometries, materials, and procedural textures */
  dispose: () => void;
}

interface LoftRing {
  y: number;
  rx: number;
  rz: number;
  xOffset?: number;
  zOffset?: number;
  frontBulge?: number;
  backFlat?: number;
  drapeAmp?: number;
  drapeFreq?: number;
}

interface SpineSection {
  pos: THREE.Vector3;
  rx: number; // radial width in local side/up plane
  rz: number; // front-to-back depth
  drapeAmp?: number;
}

/**
 * Generates a delicate procedural heavyweight organic cotton twill/jersey weave texture
 * for subtle bump micro-grain without moire.
 */
function createCottonWeaveTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    const data = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const weaveA = Math.sin((x + y) * 0.78) * 11;
        const weaveB = Math.cos((x - y) * 1.15) * 7;
        const warp = Math.sin(x * 1.57) * 5;
        const weft = Math.sin(y * 1.57) * 5;
        const grain = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const val = THREE.MathUtils.clamp(
          Math.round(128 + weaveA + weaveB + warp + weft + (grain - 0.5) * 9),
          0,
          255
        );
        const idx = (y * size + x) * 4;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a soft 1x1 vertical ribbed knit bump texture for collars, waist hems, and cuffs.
 */
function createRibKnitTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.getImageData(0, 0, size, size);
    const data = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const rib = Math.sin((x / size) * Math.PI * 32) * 38;
        const stitch = Math.sin((y / size) * Math.PI * 24 + (x % 4) * 0.6) * 8;
        const val = THREE.MathUtils.clamp(Math.round(128 + rib + stitch), 0, 255);
        const idx = (y * size + x) * 4;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Renders the crisp white-on-transparent `BOCA` Instrument Serif emblem texture.
 * Material color + emissive tint it instantaneously for Light, Dark, and Bright Sparkling Flat Gold.
 */
function createBocaEmblemTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '400 132px "Instrument Serif", Georgia, "Times New Roman", serif';
    const letters = ['B', 'O', 'C', 'A'];
    const tracking = 14;
    const widths = letters.map((ch) => ctx.measureText(ch).width);
    const totalW =
      widths.reduce((a, b) => a + b, 0) + tracking * (letters.length - 1);
    let cursorX = (w - totalW) * 0.5;
    for (let i = 0; i < letters.length; i++) {
      ctx.fillText(letters[i], cursorX + widths[i] * 0.5, h * 0.52);
      cursorX += widths[i] + tracking;
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createSharedMerchMaterials(): MerchMaterialSet {
  const cottonTex = createCottonWeaveTexture();
  const ribTex = createRibKnitTexture();
  const emblemTex = createBocaEmblemTexture();

  const fabric = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f7f7f5'),
    roughness: 0.88,
    metalness: 0.0,
    sheen: 0.30,
    sheenRoughness: 0.76,
    sheenColor: new THREE.Color('#ffffff'),
    bumpMap: cottonTex,
    bumpScale: 0.007,
    envMapIntensity: 0.85,
  });

  const rib = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f0efec'),
    roughness: 0.90,
    metalness: 0.0,
    sheen: 0.24,
    sheenRoughness: 0.80,
    sheenColor: new THREE.Color('#ffffff'),
    bumpMap: ribTex,
    bumpScale: 0.011,
    envMapIntensity: 0.78,
  });

  const underVisor = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e6e5e0'),
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.65,
  });

  // Tone-on-tone soft off-white seam material (ZERO harsh dark/black lines!)
  const seam = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ecebe7'),
    roughness: 0.86,
    metalness: 0.0,
    envMapIntensity: 0.70,
  });

  // Soft warm-gray inner collar / cuff / hood shadow depth (never harsh black!)
  const cavity = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d8d7d2'),
    roughness: 0.95,
    metalness: 0.0,
    envMapIntensity: 0.35,
  });

  const metal = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#c8ccd2'),
    metalness: 0.88,
    roughness: 0.24,
    clearcoat: 0.4,
    envMapIntensity: 1.5,
  });

  const emblem = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#111215'),
    map: emblemTex,
    transparent: true,
    alphaTest: 0.04,
    roughness: 0.36,
    metalness: 0.06,
    clearcoat: 0.22,
    envMapIntensity: 1.15,
    depthWrite: false,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts.ready.then(() => {
      const nextTex = createBocaEmblemTexture();
      const oldMap = emblem.map;
      emblem.map = nextTex;
      emblem.needsUpdate = true;
      if (oldMap && oldMap !== nextTex) {
        oldMap.dispose();
      }
      textures.push(nextTex);
    });
  }

  const textures: THREE.Texture[] = [cottonTex, ribTex, emblemTex];
  return { fabric, rib, underVisor, seam, cavity, metal, emblem, textures };
}

function applyMerchMaterialState(
  mats: MerchMaterialSet,
  isDark: boolean,
  isGold: boolean
): void {
  // Architectural heavyweight white organic cotton capsule across Light & Dark modes
  if (isDark) {
    mats.fabric.color.set('#f4f3ef');
    mats.fabric.sheenColor.set('#ffffff');
    mats.fabric.roughness = 0.85;
    mats.fabric.envMapIntensity = 0.92;

    mats.rib.color.set('#eceae4');
    mats.rib.sheenColor.set('#faf9f6');

    mats.underVisor.color.set('#dfddd6');
    mats.seam.color.set('#e5e3dc');
    mats.cavity.color.set('#c4c2bb');
  } else {
    mats.fabric.color.set('#f7f7f5');
    mats.fabric.sheenColor.set('#ffffff');
    mats.fabric.roughness = 0.88;
    mats.fabric.envMapIntensity = 0.85;

    mats.rib.color.set('#f0efec');
    mats.rib.sheenColor.set('#ffffff');

    mats.underVisor.color.set('#e6e5e0');
    mats.seam.color.set('#ecebe7');
    mats.cavity.color.set('#d8d7d2');
  }

  if (isGold) {
    // Really bright, flat, radiant sparkling 24k gold embroidery/foil + matching bright gold hardware
    mats.emblem.color.set(isDark ? '#ffe47a' : '#ffdf6b');
    mats.emblem.emissive.set('#f5c542');
    mats.emblem.emissiveIntensity = isDark ? 0.55 : 0.48;
    mats.emblem.metalness = 0.28;
    mats.emblem.roughness = 0.26;
    mats.emblem.clearcoat = 0.45;
    mats.emblem.envMapIntensity = 1.6;

    mats.metal.color.set('#ffe06e');
    mats.metal.emissive.set('#e5b435');
    mats.metal.emissiveIntensity = 0.30;
    mats.metal.metalness = 0.42;
    mats.metal.roughness = 0.20;
    mats.metal.clearcoat = 0.55;
    mats.metal.envMapIntensity = 1.85;
  } else {
    mats.emblem.color.set('#111215');
    mats.emblem.emissive.set('#000000');
    mats.emblem.emissiveIntensity = 0.0;
    mats.emblem.metalness = 0.06;
    mats.emblem.roughness = 0.36;
    mats.emblem.clearcoat = 0.22;
    mats.emblem.envMapIntensity = 1.1;

    mats.metal.color.set(isDark ? '#d8dce2' : '#aeb3bc');
    mats.metal.emissive.set('#000000');
    mats.metal.emissiveIntensity = 0.0;
    mats.metal.metalness = 0.88;
    mats.metal.roughness = 0.24;
    mats.metal.clearcoat = 0.38;
    mats.metal.envMapIntensity = 1.45;
  }

  mats.fabric.needsUpdate = true;
  mats.rib.needsUpdate = true;
  mats.underVisor.needsUpdate = true;
  mats.seam.needsUpdate = true;
  mats.cavity.needsUpdate = true;
  mats.metal.needsUpdate = true;
  mats.emblem.needsUpdate = true;
}

/**
 * Builds an organic smooth-shaded lofted vertical torso surface from stacked cross-section rings.
 */
function buildLoftedSurface(
  rings: readonly LoftRing[],
  radialSegs = 52,
  closeBottom = false,
  closeTop = false
): THREE.BufferGeometry {
  const numRings = rings.length;
  const cols = radialSegs + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < numRings; r++) {
    const ring = rings[r];
    const v = r / Math.max(1, numRings - 1);
    const xOff = ring.xOffset ?? 0;
    const zOff = ring.zOffset ?? 0;
    const bulge = ring.frontBulge ?? 0;
    const backFlat = ring.backFlat ?? 0;
    const drapeAmp = ring.drapeAmp ?? 0;
    const drapeFreq = ring.drapeFreq ?? 5;

    for (let s = 0; s <= radialSegs; s++) {
      const u = s / radialSegs;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const drape =
        drapeAmp !== 0
          ? 1 +
            drapeAmp *
              (Math.sin(theta * drapeFreq + 0.4) * 0.65 +
                Math.cos(theta * (drapeFreq + 2) - 0.7) * 0.35)
          : 1;

      const x = xOff + cosT * ring.rx * drape;
      let z = zOff + sinT * ring.rz * drape;
      if (sinT > 0 && bulge !== 0) {
        z += Math.pow(sinT, 1.8) * bulge;
      } else if (sinT < 0 && backFlat !== 0) {
        z += Math.pow(-sinT, 1.6) * backFlat;
      }

      positions.push(x, ring.y, z);
      uvs.push(u * 2.0, v * 2.0);
    }
  }

  for (let r = 0; r < numRings - 1; r++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = r * cols + s;
      const b = a + 1;
      const c = (r + 1) * cols + s;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  if (closeBottom && numRings > 0) {
    const first = rings[0];
    const centerIdx = positions.length / 3;
    positions.push(first.xOffset ?? 0, first.y, first.zOffset ?? 0);
    uvs.push(0.5, 0.5);
    for (let s = 0; s < radialSegs; s++) {
      indices.push(centerIdx, s, s + 1);
    }
  }

  if (closeTop && numRings > 0) {
    const last = rings[numRings - 1];
    const base = (numRings - 1) * cols;
    const centerIdx = positions.length / 3;
    positions.push(last.xOffset ?? 0, last.y, last.zOffset ?? 0);
    uvs.push(0.5, 0.5);
    for (let s = 0; s < radialSegs; s++) {
      indices.push(centerIdx, base + s + 1, base + s);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Lofts a smooth organic sleeve along a 3D curved spine from inside the shoulder core
 * down to the cuff, with elliptical cross-sections oriented strictly perpendicular
 * to the spline tangent so shoulder-to-sleeve flow has ZERO steps, notches, or flat caps.
 */
function buildCurvedSleeveLoft(
  sections: readonly SpineSection[],
  samplesPerSpan = 5,
  radialSegs = 32,
  closeEndCap = false,
  flipWinding = false
): THREE.BufferGeometry {
  const pts = sections.map((s) => s.pos);
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const totalSteps = (sections.length - 1) * samplesPerSpan;
  const cols = radialSegs + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const evalRadius = (t: number, key: 'rx' | 'rz' | 'drapeAmp'): number => {
    const scaled = t * (sections.length - 1);
    const i0 = Math.min(Math.floor(scaled), sections.length - 2);
    const i1 = i0 + 1;
    const frac = scaled - i0;
    const smooth = frac * frac * (3 - 2 * frac);
    const v0 = sections[i0][key] ?? 0;
    const v1 = sections[i1][key] ?? 0;
    return THREE.MathUtils.lerp(v0, v1, smooth);
  };

  const zAxis = new THREE.Vector3(0, 0, 1);
  const tangent = new THREE.Vector3();
  const inPlaneNormal = new THREE.Vector3();
  const depthAxis = new THREE.Vector3();
  const center = new THREE.Vector3();

  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    curve.getPoint(t, center);
    curve.getTangent(t, tangent).normalize();

    // Build stable twist-free frame: inPlaneNormal lies in XY plane perpendicular to tangent
    inPlaneNormal.crossVectors(zAxis, tangent).normalize();
    depthAxis.crossVectors(tangent, inPlaneNormal).normalize();

    const rx = evalRadius(t, 'rx');
    const rz = evalRadius(t, 'rz');
    const drapeAmp = evalRadius(t, 'drapeAmp');

    for (let s = 0; s <= radialSegs; s++) {
      const u = s / radialSegs;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const drape =
        drapeAmp !== 0 ? 1 + drapeAmp * Math.sin(theta * 4 + 0.5) : 1;

      const px =
        center.x +
        inPlaneNormal.x * cosT * rx * drape +
        depthAxis.x * sinT * rz * drape;
      const py =
        center.y +
        inPlaneNormal.y * cosT * rx * drape +
        depthAxis.y * sinT * rz * drape;
      const pz =
        center.z +
        inPlaneNormal.z * cosT * rx * drape +
        depthAxis.z * sinT * rz * drape;

      positions.push(px, py, pz);
      uvs.push(u * 1.5, t * 2.0);
    }
  }

  for (let i = 0; i < totalSteps; i++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = i * cols + s;
      const b = a + 1;
      const c = (i + 1) * cols + s;
      const d = c + 1;
      if (flipWinding) {
        indices.push(a, b, c);
        indices.push(b, d, c);
      } else {
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  if (closeEndCap) {
    const endCenter = curve.getPoint(1);
    const base = totalSteps * cols;
    const centerIdx = positions.length / 3;
    positions.push(endCenter.x, endCenter.y, endCenter.z);
    uvs.push(0.5, 0.5);
    for (let s = 0; s < radialSegs; s++) {
      indices.push(centerIdx, base + s + 1, base + s);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a curved front-facing patch for the `BOCA` chest or cap-crown mark so it hugs
 * the exact elliptical surface with zero z-fighting.
 */
function buildCurvedEmblemPatch(
  rx: number,
  rz: number,
  height: number,
  arcHalfAngle: number,
  yCenter: number,
  zOffset = 0,
  verticalCurve = 0,
  segX = 20,
  segY = 6
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cols = segX + 1;

  for (let iy = 0; iy <= segY; iy++) {
    const v = iy / segY;
    const ny = v - 0.5;
    const y = yCenter + ny * height;
    const vBend = -verticalCurve * ny * ny * 4;
    for (let ix = 0; ix <= segX; ix++) {
      const u = ix / segX;
      const angle = THREE.MathUtils.lerp(-arcHalfAngle, arcHalfAngle, u);
      const x = Math.sin(angle) * rx;
      const z = Math.cos(angle) * rz + zOffset + vBend;
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * cols + ix;
      const b = a + 1;
      const c = (iy + 1) * cols + ix;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a sleek low-profile 6-panel luxury dad-cap crown (`height ≈ 0.54 * width`, NOT an egg!)
 * with ultra-subtle tone-on-tone geometric panel creases (ZERO dark meridian lines!).
 */
function buildLowProfileCapCrown(): THREE.BufferGeometry {
  const segU = 72;
  const segV = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cols = segU + 1;

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = headband rim, 1 = apex
    const phi = v * (Math.PI * 0.5);
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const theta = u * Math.PI * 2; // PI/2 = front (+Z), 3PI/2 = back (-Z)
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const frontFactor = Math.max(0, sinT);
      const backFactor = Math.max(0, -sinT);

      // Authentic subtle rear keyhole arch at back bottom rim
      const rearKeyhole =
        Math.pow(backFactor, 5.2) * Math.pow(1 - v, 2.2) * 0.14;

      // Ultra-subtle tone-on-tone 6-panel geometric seam dimple (revealed gently by studio light)
      const panelAngle = ((theta + Math.PI / 6) % (Math.PI / 3) + Math.PI / 3) % (Math.PI / 3);
      const distToSeam = Math.min(panelAngle, Math.PI / 3 - panelAngle);
      const seamGroove =
        Math.exp(-(distToSeam * distToSeam) / 0.00055) * (1 - v * 0.65) * 0.0055;

      // Low-profile tailored dad-cap silhouette: wide & deep, sleek low dome
      const rx = (0.56 - seamGroove) * Math.pow(cosP, 0.72);
      const rz = (0.63 - seamGroove) * Math.pow(cosP, 0.72);
      const x = cosT * rx;
      // Gentle structured front-panel lift, soft low dome top
      const z = sinT * rz + frontFactor * cosP * 0.032;
      const y =
        -0.145 +
        sinP * 0.515 +
        frontFactor * Math.sin(phi * 1.35) * 0.028 +
        rearKeyhole;

      positions.push(x, y, z);
      uvs.push(u * 2, v);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * cols + iu;
      const b = a + 1;
      const c = (iv + 1) * cols + iu;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a bold, gracefully curved pre-bent luxury cap visor with separate top/side shell
 * and darker-white underside geometry for unmistakable cap silhouette contrast.
 */
function buildSculptedVisorParts(): {
  topGeo: THREE.BufferGeometry;
  underGeo: THREE.BufferGeometry;
} {
  const segU = 32;
  const segV = 14;
  const thickness = 0.030;

  const sampleVisor = (uNorm: number, vNorm: number, isTop: boolean) => {
    const halfWidth = 0.56 * Math.pow(1 - Math.pow(vNorm, 2.2) * 0.44, 0.70);
    const x = uNorm * halfWidth;

    const frontEdgeCurve = Math.cos(uNorm * Math.PI * 0.5);
    const zBase = 0.30 * Math.pow(frontEdgeCurve, 0.50);
    // Bold iconic curved forward projection (+0.78 from tucked crown seam)
    const z = zBase + vNorm * (0.78 * (0.45 + 0.55 * frontEdgeCurve));

    // Graceful pre-bent downward arch across X + natural forward bill slope
    const archDrop = -(uNorm * uNorm) * (0.085 + 0.10 * vNorm);
    const forwardSlope = -0.045 * vNorm - 0.030 * vNorm * vNorm;
    const edgeThin = 1 - 0.30 * Math.pow(vNorm, 2.8);
    const halfT = thickness * 0.5 * edgeThin;
    const y = -0.105 + archDrop + forwardSlope + (isTop ? halfT : -halfT);
    return [x, y, z] as const;
  };

  const cols = segU + 1;
  const rows = segV + 1;
  const layerVerts = cols * rows;

  // Top + rounded outer rim wall geometry
  const topPos: number[] = [];
  const topUv: number[] = [];
  const topIdx: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const [x, y, z] = sampleVisor(u * 2 - 1, v, true);
      topPos.push(x, y, z);
      topUv.push(u, v);
    }
  }
  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const [x, y, z] = sampleVisor(u * 2 - 1, v, false);
      topPos.push(x, y, z);
      topUv.push(u, v);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * cols + iu;
      const b = a + 1;
      const c = (iv + 1) * cols + iu;
      const d = c + 1;
      topIdx.push(a, c, b, b, c, d);
    }
  }

  // Front & side rim wall
  const frontRow = segV * cols;
  for (let iu = 0; iu < segU; iu++) {
    const t0 = frontRow + iu;
    const t1 = t0 + 1;
    const b0 = layerVerts + t0;
    const b1 = layerVerts + t1;
    topIdx.push(t0, b0, t1, t1, b0, b1);
  }
  for (let iv = 0; iv < segV; iv++) {
    const lt0 = iv * cols;
    const lt1 = (iv + 1) * cols;
    const lb0 = layerVerts + lt0;
    const lb1 = layerVerts + lt1;
    topIdx.push(lt0, lb0, lt1, lt1, lb0, lb1);

    const rt0 = iv * cols + segU;
    const rt1 = (iv + 1) * cols + segU;
    const rb0 = layerVerts + rt0;
    const rb1 = layerVerts + rt1;
    topIdx.push(rt0, rt1, rb0, rt1, rb1, rb0);
  }

  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
  topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(topUv, 2));
  topGeo.setIndex(topIdx);
  topGeo.computeVertexNormals();

  // Separate underside geometry for clean subtle darker-white underbill contrast
  const underPos: number[] = [];
  const underUv: number[] = [];
  const underIdx: number[] = [];
  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const [x, y, z] = sampleVisor(u * 2 - 1, v, false);
      underPos.push(x, y, z);
      underUv.push(u, v);
    }
  }
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * cols + iu;
      const b = a + 1;
      const c = (iv + 1) * cols + iu;
      const d = c + 1;
      underIdx.push(a, b, c, b, d, c);
    }
  }
  const underGeo = new THREE.BufferGeometry();
  underGeo.setAttribute('position', new THREE.Float32BufferAttribute(underPos, 3));
  underGeo.setAttribute('uv', new THREE.Float32BufferAttribute(underUv, 2));
  underGeo.setIndex(underIdx);
  underGeo.computeVertexNormals();

  return { topGeo, underGeo };
}

/**
 * Builds ONE continuous, thick, naturally folded draped pullover hood cowl wrapping
 * around the neckline and upper back — ZERO floating flaps or bunny ears!
 */
function buildSculptedHoodCowl(): THREE.BufferGeometry {
  const segU = 56; // full wrap around neckline (0 = front-center crossover -> back -> front-center)
  const segV = 18; // tubular folded cross-section around the draped cowl
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cols = segV + 1;

  for (let iu = 0; iu <= segU; iu++) {
    const u = iu / segU; // 0 .. 1 full closed collar loop
    // Start at front-center (+Z, angle = PI/2), wrap cleanly around right -> back -> left -> front
    const angle = Math.PI * 0.5 + u * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle); // +1 front, -1 back
    const backWeight = (1 - sinA) * 0.5; // 0 at front throat, 1 at center back

    // Path center of the thick folded hood cowl resting naturally around shoulders
    const pathRx = 0.255 + backWeight * 0.055;
    const pathRz = 0.195 + backWeight * 0.125;
    const cx = cosA * pathRx;
    const cz = sinA * pathRz - backWeight * 0.085;
    const cy = 0.625 + backWeight * 0.095 - Math.max(0, sinA) * 0.045;

    // Cross-section thickness: plump folded hood drape in back, tapered neatly at front throat overlap
    const tubeR = 0.068 + backWeight * 0.068;
    const tubeH = 0.092 + backWeight * 0.092;

    // Outward radial unit direction in XZ plane
    const radLen = Math.max(0.001, Math.hypot(cx, cz));
    const rxDir = cx / radLen;
    const rzDir = cz / radLen;

    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const phi = v * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      // Gentle soft cloth fold ripple on the outer back of the hood
      const fold = 1 + 0.04 * backWeight * Math.sin(u * Math.PI * 6 + phi);
      const x = cx + rxDir * cosP * tubeR * fold;
      const z = cz + rzDir * cosP * tubeR * fold;
      const y = cy + sinP * tubeH * fold;

      positions.push(x, y, z);
      uvs.push(u * 2, v);
    }
  }

  for (let iu = 0; iu < segU; iu++) {
    for (let iv = 0; iv < segV; iv++) {
      const a = iu * cols + iv;
      const b = a + 1;
      const c = (iu + 1) * cols + iv;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a softly embossed kangaroo front pocket with smooth beveled perimeter
 * (same white heavyweight cotton — ZERO harsh dark pocket lines!).
 */
function buildEmbossedKangarooPocket(): THREE.BufferGeometry {
  const segX = 24;
  const segY = 12;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cols = segX + 1;

  for (let iy = 0; iy <= segY; iy++) {
    const v = iy / segY;
    const y = THREE.MathUtils.lerp(-0.56, -0.15, v);
    const halfW = THREE.MathUtils.lerp(0.35, 0.235, Math.pow(v, 0.85));
    for (let ix = 0; ix <= segX; ix++) {
      const u = ix / segX;
      const nx = u * 2 - 1;
      const x = nx * halfW;
      // Smooth rounded bevel to 0 at perimeter so pocket blends softly into torso
      const bx = Math.sin(u * Math.PI);
      const by = Math.sin(v * Math.PI);
      const bevel = Math.pow(bx * by, 0.42);
      const torsoZ = 0.258 * Math.cos(nx * 0.62) + 0.032;
      const puff = 0.026 * bevel;
      positions.push(x, y, torsoZ + puff);
      uvs.push(u, v);
    }
  }

  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * cols + ix;
      const b = a + 1;
      const c = (iy + 1) * cols + ix;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * 1. Architectural Heavyweight White Boxy Tee (`BOCA` chest print).
 * Continuous curved-spine drop-shoulder sleeves seamlessly merged into the torso.
 */
export function createBocaShirt(mats: MerchMaterialSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BocaMerch_Shirt';

  // Sculpted heavyweight boxy torso with natural tailored shoulder slope & gentle hem drape
  const torsoRings: LoftRing[] = [
    { y: -0.78, rx: 0.49, rz: 0.21, frontBulge: 0.016, drapeAmp: 0.020, drapeFreq: 5 },
    { y: -0.56, rx: 0.485, rz: 0.21, frontBulge: 0.022, drapeAmp: 0.012, drapeFreq: 5 },
    { y: -0.22, rx: 0.485, rz: 0.214, frontBulge: 0.030, drapeAmp: 0.005, drapeFreq: 5 },
    { y: 0.14, rx: 0.50, rz: 0.220, frontBulge: 0.036, backFlat: 0.012 },
    { y: 0.44, rx: 0.525, rz: 0.214, frontBulge: 0.028, backFlat: 0.014 },
    { y: 0.59, rx: 0.485, rz: 0.194, frontBulge: 0.018, backFlat: 0.010 },
    { y: 0.69, rx: 0.34, rz: 0.160, frontBulge: 0.008 },
    { y: 0.74, rx: 0.205, rz: 0.136 },
  ];
  const torsoGeo = buildLoftedSurface(torsoRings, 52, true, false);
  const torsoMesh = new THREE.Mesh(torsoGeo, mats.fabric);
  torsoMesh.name = 'ShirtTorso';
  group.add(torsoMesh);

  // Soft warm-gray inner neck depth
  const neckCavityGeo = new THREE.CylinderGeometry(0.188, 0.188, 0.04, 32);
  const neckCavity = new THREE.Mesh(neckCavityGeo, mats.cavity);
  neckCavity.position.set(0, 0.735, 0.006);
  neckCavity.scale.set(1.0, 1.0, 0.72);
  group.add(neckCavity);

  // Sculpted ribbed crew-neck collar ring
  const collarGeo = new THREE.TorusGeometry(0.20, 0.034, 16, 44);
  collarGeo.rotateX(Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeo, mats.rib);
  collarMesh.position.set(0, 0.748, 0.008);
  collarMesh.scale.set(1.02, 0.90, 0.74);
  collarMesh.rotation.x = 0.14;
  group.add(collarMesh);

  // Seamless curved-spine drop-shoulder short sleeves (Left & Right)
  // Spine starts deep inside the shoulder slope and curves smoothly outward & downward
  for (const side of [-1, 1] as const) {
    const sleeveSections: SpineSection[] = [
      { pos: new THREE.Vector3(side * 0.26, 0.555, 0.0), rx: 0.145, rz: 0.155 },
      { pos: new THREE.Vector3(side * 0.44, 0.515, 0.0), rx: 0.188, rz: 0.184 },
      { pos: new THREE.Vector3(side * 0.59, 0.385, 0.005), rx: 0.186, rz: 0.172, drapeAmp: 0.010 },
      { pos: new THREE.Vector3(side * 0.71, 0.22, 0.012), rx: 0.178, rz: 0.158, drapeAmp: 0.016 },
      { pos: new THREE.Vector3(side * 0.80, 0.08, 0.016), rx: 0.174, rz: 0.152, drapeAmp: 0.018 },
    ];
    const sleeveGeo = buildCurvedSleeveLoft(sleeveSections, 6, 32, true, true);
    const sleeveMesh = new THREE.Mesh(sleeveGeo, mats.fabric);
    group.add(sleeveMesh);
  }

  // Crisp centered `BOCA` Instrument Serif chest print
  const chestEmblemGeo = buildCurvedEmblemPatch(
    0.505,
    0.258,
    0.24,
    0.46,
    0.25,
    0.008,
    0.006
  );
  const chestEmblem = new THREE.Mesh(chestEmblemGeo, mats.emblem);
  chestEmblem.name = 'ShirtBocaEmblem';
  chestEmblem.renderOrder = 5;
  group.add(chestEmblem);

  return group;
}

/**
 * 2. Sleek Low-Profile 6-Panel White Luxury Cap (`BOCA` front-crown embroidery).
 * Iconic 3/4 display angle, sweeping curved visor, tone-on-tone 6-panel geometry (ZERO dark lines!).
 */
export function createBocaHat(mats: MerchMaterialSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BocaMerch_Hat';

  const pivot = new THREE.Group();
  // Iconic low-profile 3/4 studio presentation angle so the sweeping curved visor is unmistakable
  pivot.scale.setScalar(1.24);
  pivot.position.set(0.02, -0.04, -0.10);
  pivot.rotation.set(0.16, -0.30, 0.0);
  group.add(pivot);

  // Sleek low-profile 6-panel crown dome with subtle tone-on-tone panel bevels
  const crownGeo = buildLowProfileCapCrown();
  const crownMesh = new THREE.Mesh(crownGeo, mats.fabric);
  crownMesh.name = 'HatCrown';
  pivot.add(crownMesh);

  // Soft warm-gray interior sweatband shadow
  const underCapGeo = new THREE.CylinderGeometry(0.535, 0.535, 0.026, 40);
  const underCap = new THREE.Mesh(underCapGeo, mats.cavity);
  underCap.position.set(0, -0.142, 0.0);
  underCap.scale.set(1.0, 1.0, 1.12);
  pivot.add(underCap);

  // Top crown squab button (same crisp white fabric)
  const buttonGeo = new THREE.SphereGeometry(0.048, 20, 12);
  buttonGeo.scale(1, 0.42, 1);
  const buttonMesh = new THREE.Mesh(buttonGeo, mats.fabric);
  buttonMesh.position.set(0, 0.375, 0.0);
  pivot.add(buttonMesh);

  // Bold gracefully curved pre-bent front visor + darker-white underside
  const { topGeo, underGeo } = buildSculptedVisorParts();
  const visorTop = new THREE.Mesh(topGeo, mats.fabric);
  visorTop.name = 'HatVisor';
  pivot.add(visorTop);

  const visorUnder = new THREE.Mesh(underGeo, mats.underVisor);
  visorUnder.name = 'HatVisorUnder';
  pivot.add(visorUnder);

  // Rear tone-on-tone fabric strap + brushed metallic clasp across keyhole arch
  const strapPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const a = THREE.MathUtils.lerp(-0.46, 0.46, t);
    strapPts.push(
      new THREE.Vector3(Math.sin(a) * 0.535, -0.102, -Math.cos(a) * 0.615)
    );
  }
  const strapCurve = new THREE.CatmullRomCurve3(strapPts);
  const strapGeo = new THREE.TubeGeometry(strapCurve, 16, 0.020, 8, false);
  strapGeo.scale(1, 1.35, 0.55);
  pivot.add(new THREE.Mesh(strapGeo, mats.rib));

  const claspGeo = new THREE.BoxGeometry(0.105, 0.064, 0.030);
  const claspMesh = new THREE.Mesh(claspGeo, mats.metal);
  claspMesh.position.set(0, -0.102, -0.625);
  pivot.add(claspMesh);

  // Crisp centered `BOCA` Instrument Serif embroidery on the lower front crown
  const crownEmblemGeo = buildCurvedEmblemPatch(
    0.515,
    0.615,
    0.175,
    0.38,
    0.095,
    0.022,
    0.028
  );
  const crownEmblem = new THREE.Mesh(crownEmblemGeo, mats.emblem);
  crownEmblem.name = 'HatBocaEmblem';
  crownEmblem.renderOrder = 5;
  pivot.add(crownEmblem);

  return group;
}

/**
 * 3. Architectural Heavyweight White Pullover Hoodie (`BOCA` chest print).
 * Seamless curved-spine long sleeves, continuous folded cowl hood (ZERO bunny ears!),
 * softly embossed kangaroo pocket (ZERO dark lines!), and neat white drawstrings above BOCA.
 */
export function createBocaHoodie(mats: MerchMaterialSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BocaMerch_Hoodie';

  // Fuller relaxed heavyweight fleece torso
  const torsoRings: LoftRing[] = [
    { y: -0.68, rx: 0.485, rz: 0.235, frontBulge: 0.022, drapeAmp: 0.016, drapeFreq: 6 },
    { y: -0.45, rx: 0.532, rz: 0.256, frontBulge: 0.032, drapeAmp: 0.010, drapeFreq: 6 },
    { y: -0.10, rx: 0.542, rz: 0.262, frontBulge: 0.038, backFlat: 0.012 },
    { y: 0.24, rx: 0.548, rz: 0.258, frontBulge: 0.034, backFlat: 0.015 },
    { y: 0.48, rx: 0.515, rz: 0.238, frontBulge: 0.020, backFlat: 0.016 },
    { y: 0.61, rx: 0.35, rz: 0.195, frontBulge: 0.010 },
    { y: 0.66, rx: 0.235, rz: 0.168 },
  ];
  const torsoGeo = buildLoftedSurface(torsoRings, 52, false, false);
  const torsoMesh = new THREE.Mesh(torsoGeo, mats.fabric);
  torsoMesh.name = 'HoodieTorso';
  group.add(torsoMesh);

  // Snug ribbed waist hem band
  const waistRings: LoftRing[] = [
    { y: -0.82, rx: 0.455, rz: 0.218, frontBulge: 0.016 },
    { y: -0.75, rx: 0.468, rz: 0.226, frontBulge: 0.018 },
    { y: -0.67, rx: 0.488, rz: 0.236, frontBulge: 0.022 },
  ];
  const waistGeo = buildLoftedSurface(waistRings, 52, true, false);
  group.add(new THREE.Mesh(waistGeo, mats.rib));

  // Soft warm-gray recessed throat shadow inside hood collar
  const neckCavityGeo = new THREE.CylinderGeometry(0.195, 0.195, 0.05, 32);
  const neckCavity = new THREE.Mesh(neckCavityGeo, mats.cavity);
  neckCavity.position.set(0, 0.65, -0.01);
  neckCavity.scale.set(1.0, 1.0, 0.80);
  group.add(neckCavity);

  // Continuous thick folded pullover hood cowl wrapping naturally around collar & upper back
  const hoodCowlGeo = buildSculptedHoodCowl();
  const hoodMesh = new THREE.Mesh(hoodCowlGeo, mats.fabric);
  hoodMesh.name = 'HoodieHood';
  group.add(hoodMesh);

  // Softly embossed kangaroo front pocket (same white cotton, ZERO harsh dark horizontal line!)
  const pocketGeo = buildEmbossedKangarooPocket();
  const pocketMesh = new THREE.Mesh(pocketGeo, mats.fabric);
  pocketMesh.name = 'HoodieKangarooPocket';
  group.add(pocketMesh);

  // Slim white braided drawstrings with brushed metallic eyelets & aglets neatly ABOVE BOCA
  const eyeletGeo = new THREE.TorusGeometry(0.014, 0.0045, 8, 18);
  const agletGeo = new THREE.CylinderGeometry(0.0095, 0.008, 0.044, 12);

  for (const side of [-1, 1] as const) {
    const eyelet = new THREE.Mesh(eyeletGeo, mats.metal);
    eyelet.position.set(side * 0.072, 0.60, 0.212);
    eyelet.rotation.y = side * 0.22;
    group.add(eyelet);

    const cordPts = [
      new THREE.Vector3(side * 0.072, 0.596, 0.222),
      new THREE.Vector3(side * 0.088, 0.49, 0.274),
      new THREE.Vector3(side * 0.096, 0.375, 0.296),
    ];
    const cordCurve = new THREE.CatmullRomCurve3(cordPts);
    const cordGeo = new THREE.TubeGeometry(cordCurve, 16, 0.0085, 8, false);
    group.add(new THREE.Mesh(cordGeo, mats.rib));

    const aglet = new THREE.Mesh(agletGeo, mats.metal);
    aglet.position.set(side * 0.098, 0.352, 0.297);
    aglet.rotation.z = side * 0.05;
    group.add(aglet);
  }

  // Seamless curved-spine relaxed long sleeves + snug ribbed cuffs (Left & Right)
  for (const side of [-1, 1] as const) {
    const armSections: SpineSection[] = [
      { pos: new THREE.Vector3(side * 0.28, 0.47, -0.01), rx: 0.165, rz: 0.175 },
      { pos: new THREE.Vector3(side * 0.48, 0.425, -0.01), rx: 0.205, rz: 0.195 },
      { pos: new THREE.Vector3(side * 0.61, 0.21, 0.005), rx: 0.195, rz: 0.184, drapeAmp: 0.010 },
      { pos: new THREE.Vector3(side * 0.68, -0.10, 0.025), rx: 0.180, rz: 0.170, drapeAmp: 0.015 },
      { pos: new THREE.Vector3(side * 0.72, -0.44, 0.040), rx: 0.158, rz: 0.150, drapeAmp: 0.012 },
      { pos: new THREE.Vector3(side * 0.74, -0.58, 0.045), rx: 0.140, rz: 0.134 },
    ];
    const armGeo = buildCurvedSleeveLoft(armSections, 5, 32, false, true);
    group.add(new THREE.Mesh(armGeo, mats.fabric));

    const cuffSections: SpineSection[] = [
      { pos: new THREE.Vector3(side * 0.74, -0.57, 0.045), rx: 0.136, rz: 0.130 },
      { pos: new THREE.Vector3(side * 0.755, -0.70, 0.048), rx: 0.116, rz: 0.112 },
    ];
    const cuffGeo = buildCurvedSleeveLoft(cuffSections, 4, 32, true, true);
    group.add(new THREE.Mesh(cuffGeo, mats.rib));
  }

  // Crisp centered `BOCA` Instrument Serif chest print (cleanly below aglets & above kangaroo pocket)
  const chestEmblemGeo = buildCurvedEmblemPatch(
    0.555,
    0.298,
    0.23,
    0.42,
    0.155,
    0.010,
    0.008
  );
  const chestEmblem = new THREE.Mesh(chestEmblemGeo, mats.emblem);
  chestEmblem.name = 'HoodieBocaEmblem';
  chestEmblem.renderOrder = 5;
  group.add(chestEmblem);

  return group;
}

/**
 * Creates all 3 normalized luxury 3D BOCA WATER apparel sculptures sharing
 * a single lean GPU material & texture set, ready for Shop Row 2 & Mobile Slides 4-6.
 */
export function createShopMerchTrio(): MerchTrioHandle {
  const mats = createSharedMerchMaterials();

  const shirtGroup = createBocaShirt(mats);
  const hatGroup = createBocaHat(mats);
  const hoodieGroup = createBocaHoodie(mats);

  const update = (isDark: boolean, isGold: boolean) => {
    applyMerchMaterialState(mats, isDark, isGold);
  };

  update(false, false);

  const dispose = () => {
    const disposedGeos = new Set<THREE.BufferGeometry>();
    for (const root of [shirtGroup, hatGroup, hoodieGroup]) {
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry && !disposedGeos.has(mesh.geometry)) {
          disposedGeos.add(mesh.geometry);
          mesh.geometry.dispose();
        }
      });
    }
    mats.fabric.dispose();
    mats.rib.dispose();
    mats.underVisor.dispose();
    mats.seam.dispose();
    mats.cavity.dispose();
    mats.metal.dispose();
    mats.emblem.dispose();
    for (const tex of mats.textures) {
      tex.dispose();
    }
  };

  return {
    shirtGroup,
    hatGroup,
    hoodieGroup,
    updateMerchMaterials: update,
    dispose,
  };
}

/**
 * Convenience helper forwarding directly to `handle.updateMerchMaterials(isDark, isGold)`.
 */
export function updateMerchMaterials(
  handle: MerchTrioHandle,
  isDark: boolean,
  isGold: boolean
): void {
  handle.updateMerchMaterials(isDark, isGold);
}
