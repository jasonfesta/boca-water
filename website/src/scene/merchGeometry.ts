import * as THREE from 'three';
import shirtTextureUrl from '@/assets/merch/shirt.webp';
import hatTextureUrl from '@/assets/merch/hat.webp';
import hoodieTextureUrl from '@/assets/merch/hoodie.webp';

/**
 * Photorealistic 3D sculpted relief studio meshes for BOCA WATER apparel
 * (Heavyweight Boxy Tee, 5-Panel Twill Cap, Heavyweight Pullover Hoodie)
 * built 100% from the approved studio references with curved 3D depth relief,
 * live Light/Dark exposure balance, and real-time gold foil / classic ink toggle.
 */

export interface MerchTrioHandle {
  shirtGroup: THREE.Group;
  hatGroup: THREE.Group;
  hoodieGroup: THREE.Group;
  /** Update studio exposure & BOCA WATER logo finish live for Light, Dark, and Gold modes */
  updateMerchMaterials: (isDark: boolean, isGold: boolean) => void;
  /** Advance animated 24k gold sheen & micro-sparkle time across the apparel BOCA WATER logos */
  setSparkleTime: (time: number) => void;
  /** Cleanly dispose all geometries, materials, and textures */
  dispose: () => void;
}

type GarmentKind = 'shirt' | 'hat' | 'hoodie';

/**
 * Builds a smoothly subdivided 3D curved relief geometry tailored to each garment's
 * real physical volume (torso cylinder + standing hood / pocket depth / curved cap visor)
 * so gentle hover turns and pointer parallax reveal authentic 3D sculptural depth.
 */
function buildGarmentReliefGeometry(kind: GarmentKind, size = 1.62): THREE.BufferGeometry {
  const segs = 48;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / (size * 0.5); // -1..1
    const ny = y / (size * 0.5); // -1..1

    let z = 0;
    if (kind === 'shirt') {
      // Boxy chest/torso cylindrical bow + subtle forward shoulder/sleeve drape
      const torsoDome = Math.max(0, 1 - nx * nx * 1.12);
      const vertCurve = Math.max(0, 1 - (ny * 0.62) * (ny * 0.62));
      const sleeveDrop = Math.abs(nx) > 0.45 ? -0.06 * Math.abs(nx - Math.sign(nx) * 0.45) : 0;
      z = 0.19 * Math.pow(torsoDome, 0.72) * (0.68 + 0.32 * vertCurve) + sleeveDrop;
    } else if (kind === 'hoodie') {
      // Sculpted torso dome + slightly recessed standing hood interior + protruding kangaroo pocket
      const torsoDome = Math.max(0, 1 - nx * nx * 1.25);
      const isHood = Math.max(0, Math.min(1, (ny - 0.34) / 0.22));
      const hoodOuter = Math.max(0, 1 - (nx * 2.55) * (nx * 2.55));
      const hoodCavity =
        Math.exp(-Math.pow(nx / 0.14, 2)) *
        Math.exp(-Math.pow((ny - 0.66) / 0.18, 2));
      const pocketBump =
        Math.exp(-Math.pow(nx / 0.28, 2)) *
        Math.exp(-Math.pow((ny + 0.42) / 0.20, 2));
      const torsoZ = 0.21 * Math.pow(torsoDome, 0.74) + 0.045 * pocketBump;
      const hoodZ = 0.18 * Math.pow(hoodOuter, 0.65) - 0.13 * hoodCavity;
      z = THREE.MathUtils.lerp(torsoZ, hoodZ, isHood);
    } else {
      // Structured 5-panel baseball cap: round spherical crown + bold forward-sweeping curved visor
      const crownR2 = Math.pow((nx - 0.06) / 0.74, 2) + Math.pow((ny - 0.14) / 0.62, 2);
      const crownDome = Math.sqrt(Math.max(0, 1 - Math.min(1, crownR2))) * 0.28;
      // Forward-projecting curved visor toward bottom-left (-x, -y) matching 3/4 reference angle
      const visorMask =
        Math.max(0, Math.min(1, (-ny + 0.04) / 0.42)) *
        Math.max(0, Math.min(1, (0.55 - nx) / 0.75));
      const visorArch = Math.max(0, 1 - Math.pow((nx + 0.22) / 0.62, 2));
      const visorExtend = visorMask * (0.20 + 0.14 * visorArch) * Math.max(0, 1 - Math.abs(ny + 0.34) * 0.8);
      z = crownDome + visorExtend;
    }

    pos.setZ(i, z);
  }

  geo.computeVertexNormals();
  return geo;
}

interface StudioGarmentInstance {
  group: THREE.Group;
  material: THREE.ShaderMaterial;
  texture: THREE.Texture;
  geometry: THREE.BufferGeometry;
}

function createSculptedStudioGarment(
  kind: GarmentKind,
  textureUrl: string,
  size: number
): StudioGarmentInstance {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(textureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const geometry = buildGarmentReliefGeometry(kind, size);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uIsDark: { value: 0.0 },
      uIsGold: { value: 1.0 },
      uSparkleTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uIsDark;
      uniform float uIsGold;
      uniform float uSparkleTime;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;

      float merchGoldHash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec4 tex = texture2D(uMap, vUv);
        if (tex.a < 0.025) discard;

        vec3 col = tex.rgb;

        // Detect warm gold foil/embroidery pixels (BOCA WATER logo) vs pure white cotton fabric
        float goldChroma = max(0.0, min(col.r, col.g) - col.b);
        float isLogoGold = smoothstep(0.08, 0.22, goldChroma);

        // Neutralize any cool blue/lavender shadow cast in cotton folds so Shirt, Hat & Hoodie share
        // one unified crisp architectural warm-white studio fabric tone (zero purple/blue drift)
        float fabricLuma = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 pureWhiteCotton = vec3(fabricLuma * 1.012, fabricLuma * 1.008, fabricLuma * 0.996);
        col = mix(col, mix(col, pureWhiteCotton, 0.92), 1.0 - isLogoGold);

        // When Classic Ink mode is toggled (uIsGold == 0), convert gold logo cleanly to rich matte charcoal ink
        vec3 classicInk = vec3(0.075, 0.08, 0.095);
        // When Gold mode is active (uIsGold == 1), boost vibrant 24k champagne-gold sheen + subtle moving sparkle
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(vec3(-0.35, 0.55, 0.85));
        float ndl = clamp(dot(N, L), 0.0, 1.0);
        float spec = pow(max(dot(reflect(-L, N), V), 0.0), 18.0);

        // Diagonal luxury foil sweep + pinpoint micro-glints strictly inside the gold BOCA WATER logo
        float sweepPhase = fract(uSparkleTime * 0.18);
        float diagCoord = vUv.x * 1.25 - vUv.y * 0.35;
        float sweepBand = exp(-pow((diagCoord - (sweepPhase * 2.2 - 0.55)) * 7.5, 2.0));
        vec2 gUv = vUv * 220.0;
        vec2 gCell = floor(gUv);
        vec2 gLocal = fract(gUv) - 0.5;
        float h1 = merchGoldHash(gCell);
        float h2 = merchGoldHash(gCell + 17.3);
        float tw = pow(max(0.0, sin(uSparkleTime * (2.6 + h2 * 3.4) + h1 * 62.83 + dot(V.xy, vec2(6.0, 4.0)))), 10.0);
        float spark = step(0.76, h1) * tw * smoothstep(0.42, 0.05, length(gLocal));

        vec3 brightGold = clamp(
          col * vec3(1.10, 1.06, 0.92) +
          vec3(0.26, 0.20, 0.05) * (0.34 + spec * 0.95) +
          vec3(0.48, 0.44, 0.28) * sweepBand * 0.55 +
          vec3(1.0, 0.96, 0.78) * spark * 0.95,
          0.0,
          1.0
        );
        vec3 logoCol = mix(classicInk, brightGold, uIsGold);
        col = mix(col, logoCol, isLogoGold);

        // Subtle physical 3D relief shading response as garment turns on hover
        float reliefShade = mix(0.955, 1.045, ndl);
        col *= mix(1.0, reliefShade, 0.55);

        // Crisp tonal balance against warm gallery white (Light) vs obsidian void (Dark)
        float lightGain = mix(1.02, 0.98, uIsDark);
        col = clamp(col * lightGain, 0.0, 1.0);

        gl_FragColor = vec4(col, tex.a);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `BocaStudioMerch_${kind}`;
  mesh.renderOrder = 3;

  const group = new THREE.Group();
  group.name = `BocaMerchGroup_${kind}`;
  group.add(mesh);

  return { group, material, texture, geometry };
}

export function createShopMerchTrio(): MerchTrioHandle {
  const shirt = createSculptedStudioGarment('shirt', shirtTextureUrl, 1.72);
  const hat = createSculptedStudioGarment('hat', hatTextureUrl, 1.66);
  const hoodie = createSculptedStudioGarment('hoodie', hoodieTextureUrl, 1.76);

  const items = [shirt, hat, hoodie];

  const updateMerchMaterials = (isDark: boolean, isGold: boolean) => {
    for (const item of items) {
      item.material.uniforms.uIsDark.value = isDark ? 1.0 : 0.0;
      item.material.uniforms.uIsGold.value = isGold ? 1.0 : 0.0;
    }
  };

  const setSparkleTime = (time: number) => {
    for (const item of items) {
      item.material.uniforms.uSparkleTime.value = time;
    }
  };

  const dispose = () => {
    for (const item of items) {
      item.geometry.dispose();
      item.material.dispose();
      item.texture.dispose();
    }
  };

  return {
    shirtGroup: shirt.group,
    hatGroup: hat.group,
    hoodieGroup: hoodie.group,
    updateMerchMaterials,
    setSparkleTime,
    dispose,
  };
}
