import * as THREE from 'three';
import {
  DEFAULT_BOTTLE_TUNE_PARAMS,
  type BottleTuneParams,
  type ScrollState,
} from './types';

export interface SparklingWaterSystem {
  /** Root group placed inside the sleek 12 fl oz PET can assembly */
  group: THREE.Group;
  /** Animate nucleation streams, wall carbonation, meniscus slosh, and Orka headspace air-pocket */
  update: (time: number, dt: number, scroll: ScrollState) => void;
  /** Dispose GPU resources */
  dispose: () => void;
}

export type SparklingWaterHandle = SparklingWaterSystem;

interface RisingBubbleSeed {
  angle: number;
  radialFactor: number;
  yNorm: number;
  speed: number;
  radius: number;
  wobbleAmp: number;
  wobbleFreq: number;
  phase: number;
  isStream: boolean;
}

interface WallBubbleSeed {
  angle: number;
  yNorm: number;
  radius: number;
  phase: number;
  shimmerFreq: number;
}

interface CrownBubbleSeed {
  angle: number;
  /** For air-pocket pearls: parametric t from top shoulder (0) to bottom apex (1) */
  tArc: number;
  radialOffset: number;
  yOffset: number;
  radius: number;
  phase: number;
  onAirPocket: boolean;
}

/**
 * Computes the inner liquid radius at a given normalized can height (0..1),
 * matching the sleek 12 fl oz PET can heel and short neck-in taper in bottleGeometry.ts.
 */
function sampleLiquidRadiusAtYNorm(
  yNorm: number,
  innerBodyR: number,
  innerNeckR: number
): number {
  if (yNorm <= 0.108) {
    const t = THREE.MathUtils.clamp((yNorm - 0.042) / 0.066, 0, 1);
    const angle = (t * Math.PI) / 2;
    return THREE.MathUtils.lerp(innerBodyR * 0.72, innerBodyR, Math.sin(angle));
  }
  if (yNorm <= 0.895) {
    return innerBodyR;
  }
  const t = THREE.MathUtils.clamp((yNorm - 0.895) / (0.962 - 0.895), 0, 1);
  const ease = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(innerBodyR, innerNeckR, ease);
}

/**
 * Deterministic PRNG so nucleation streams, condensation droplets, and pearl
 * distributions are art-directed and repeatable across visual study passes.
 */
function createSeededRandom(seed = 20261122): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Generates procedural chilled condensation micro-mist textures (alpha + micro-bead bump)
 * inspired by Orka reference photo 2: delicate ice-cold frost clinging cleanly over the
 * chilled liquid zone and fading naturally above the waterline.
 */
function createChilledCondensationTextures(fillNorm: number): {
  alphaMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const width = 512;
  const height = 512;
  const rand = createSeededRandom(90817263);

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = width;
  alphaCanvas.height = height;
  const aCtx = alphaCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d');

  if (aCtx && bCtx) {
    // Base neutral bump, dark alpha
    aCtx.fillStyle = '#000000';
    aCtx.fillRect(0, 0, width, height);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, width, height);

    // 1. Soft organic condensation mist clouds (strongest over the chilled liquid zone)
    const waterTopPx = Math.floor((1 - fillNorm) * height);
    const chillGrad = aCtx.createLinearGradient(0, 0, 0, height);
    chillGrad.addColorStop(0.0, 'rgba(255,255,255,0.0)');
    chillGrad.addColorStop(
      Math.max(0.02, (waterTopPx / height) * 0.85),
      'rgba(255,255,255,0.06)'
    );
    chillGrad.addColorStop(
      Math.min(0.95, waterTopPx / height + 0.06),
      'rgba(255,255,255,0.46)'
    );
    chillGrad.addColorStop(0.55, 'rgba(255,255,255,0.52)');
    chillGrad.addColorStop(0.86, 'rgba(255,255,255,0.38)');
    chillGrad.addColorStop(1.0, 'rgba(255,255,255,0.08)');
    aCtx.fillStyle = chillGrad;
    aCtx.fillRect(0, 0, width, height);

    // Organic soft frost patches (subtle cold-hand / humidity variation)
    for (let i = 0; i < 65; i++) {
      const cx = rand() * width;
      const cy = waterTopPx + rand() * (height - waterTopPx);
      const r = 18 + rand() * 54;
      const bright = rand() > 0.38;
      const g = aCtx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
      if (bright) {
        g.addColorStop(0, 'rgba(255,255,255,0.22)');
        g.addColorStop(1, 'rgba(255,255,255,0.0)');
      } else {
        g.addColorStop(0, 'rgba(0,0,0,0.24)');
        g.addColorStop(1, 'rgba(0,0,0,0.0)');
      }
      aCtx.fillStyle = g;
      aCtx.beginPath();
      aCtx.arc(cx, cy, r, 0, Math.PI * 2);
      aCtx.fill();
    }

    // 2. Ultra-fine micro-mist stipple in both alpha and bump maps
    for (let i = 0; i < 4200; i++) {
      const x = rand() * width;
      const y = waterTopPx * 0.72 + rand() * (height - waterTopPx * 0.72);
      const r = 0.55 + Math.pow(rand(), 2.2) * 2.2;
      const alphaVal = 0.08 + rand() * 0.32;

      aCtx.fillStyle = `rgba(255,255,255,${alphaVal.toFixed(3)})`;
      aCtx.beginPath();
      aCtx.arc(x, y, r, 0, Math.PI * 2);
      aCtx.fill();

      const bumpLum = Math.floor(150 + rand() * 95);
      bCtx.fillStyle = `rgb(${bumpLum},${bumpLum},${bumpLum})`;
      bCtx.beginPath();
      bCtx.arc(x, y, r * 1.15, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  const alphaMap = new THREE.CanvasTexture(alphaCanvas);
  alphaMap.wrapS = THREE.RepeatWrapping;
  alphaMap.wrapT = THREE.ClampToEdgeWrapping;
  alphaMap.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  bumpMap.needsUpdate = true;

  return { alphaMap, bumpMap };
}

/**
 * Samples the radius of the rotationally symmetric 3D Orka teardrop headspace
 * air-pocket dome at normalized depth t (0 = top at waterline, 1 = rounded bottom apex).
 * Strictly bounded inside innerNeckR * 0.74 so it can never clip or protrude at any angle.
 */
function sampleAirPocketRadius(t: number, maxPocketR: number): number {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  // Smooth inverted parabolic/teardrop profile with clean tangent at apex (t=1)
  return maxPocketR * Math.pow(Math.max(0, 1 - Math.pow(clamped, 1.95)), 0.52);
}

/**
 * Builds the signature Orka teardrop / inverted-dome headspace air-pocket as a
 * smooth, closed, rotationally symmetric 3D LatheGeometry centered strictly inside
 * the upper liquid column (radius <= innerRadius * 0.74).
 *
 * Because it is a closed 3D solid of revolution with smooth normals, it renders
 * with ZERO deformity, ZERO sharp crescent edge, and ZERO clipping from every
 * angle (front, side, back, close-up macro, and horizontal sideways).
 */
function buildOrkaTeardropAirPocketGeometry(
  maxPocketR: number,
  pocketDrop: number
): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 28;

  // Bottom apex (r = 0) curving smoothly upward to the upper shoulder rim
  for (let i = 0; i <= steps; i++) {
    const t = 1 - i / steps; // 1 (bottom apex) -> 0 (top shoulder)
    const r = sampleAirPocketRadius(t, maxPocketR);
    const y = -0.004 - t * pocketDrop;
    pts.push(new THREE.Vector2(Math.max(0, r), y));
  }

  // Smoothly round top shoulder inward to close the dome cleanly under the waterline
  pts.push(new THREE.Vector2(maxPocketR * 0.94, -0.002));
  pts.push(new THREE.Vector2(maxPocketR * 0.72, -0.001));
  pts.push(new THREE.Vector2(0, -0.001));

  const geo = new THREE.LatheGeometry(pts, 64);
  geo.computeVertexNormals();

  // Explicitly weld bottom apex & top center pole normals so macro views have zero Lathe pinch
  const posAttr = geo.getAttribute('position');
  const normAttr = geo.getAttribute('normal');
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const pz = posAttr.getZ(i);
    if (Math.hypot(px, pz) < 0.015) {
      if (py < -pocketDrop * 0.5) {
        normAttr.setXYZ(i, 0, -1, 0);
      } else {
        normAttr.setXYZ(i, 0, 1, 0);
      }
    }
  }
  normAttr.needsUpdate = true;

  return geo;
}

/**
 * Optical water-to-PET edge-refraction shader:
 * Reproduces the crisp liquid-column refractive edge band inside the PET wall
 * (visible along both sides of the Orka cans) without muddying the clear center.
 */
function createWaterEdgeRefractionMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCoolWhite: { value: new THREE.Color('#eef7ff') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uCoolWhite;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec2 vUv;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);

        // Strictly razor-grazing outer water-to-PET edge band (zero center vertical bars)
        float outerRim = pow(1.0 - ndv, 4.8);
        float sideBias = smoothstep(0.18, 0.92, abs(N.x));

        // Smooth fade at bottom heel and top waterline
        float vMask = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
        float alpha = clamp(outerRim * sideBias * 0.36 * vMask, 0.0, 0.38);

        gl_FragColor = vec4(uCoolWhite, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.FrontSide,
  });
}

/**
 * Custom 3D view-dependent refractive shader for the signature Orka teardrop
 * headspace air-pocket dome:
 * Pure 3D Fresnel total-internal-reflection rim + dual studio catchlights so the
 * curved meniscus boundary stays razor-clean and distortion-free from every 360° angle.
 */
function createOrkaAirPocketBoundaryMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSpecColor: { value: new THREE.Color('#ffffff') },
      uTintColor: { value: new THREE.Color('#dbeeff') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uSpecColor;
      uniform vec3 uTintColor;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);

        // True 3D view-dependent grazing TIR meniscus rim (smooth at every rotation)
        float fresnelRim = pow(1.0 - ndv, 2.35);
        float crispEdge = smoothstep(0.45, 0.92, 1.0 - ndv);
        float softBody = pow(1.0 - ndv, 1.35) * 0.20;

        // Dual studio catchlights (upper-left & upper-right studio scrims)
        vec3 L1 = normalize(vec3(-0.42, 0.78, 0.46));
        vec3 L2 = normalize(vec3(0.52, 0.68, 0.52));
        float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 42.0);
        float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 32.0) * 0.65;

        // Soft fade right at the flat top cap where the dome merges into the waterline
        float topFade = smoothstep(-0.002, -0.022, vLocalPos.y);

        float luminance = (fresnelRim * 0.78 + crispEdge * 0.34 + softBody + (spec1 + spec2) * 0.85) * topFade;
        vec3 col = mix(uTintColor, uSpecColor, clamp(crispEdge * 0.85 + spec1 + spec2, 0.0, 1.0));
        float alpha = clamp(luminance * 0.72 + 0.02 * topFade, 0.0, 0.82);

        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.FrontSide,
  });
}

/**
 * Photoreal air-in-water optical-lensing bubble shader (air IOR 1.0 inside water IOR 1.333):
 * - Crystal-transparent hollow core (ndv > 0.72)
 * - Total-internal-reflection (TIR) silver-white grazing rim (critical angle ~48.6 deg)
 * - Realistic DARK lower-hemisphere refractive shadow crescent (gives true 3D glass-pearl depth)
 * - Razor-sharp pinpoint upper studio catchlight + subtle inverted bottom internal caustic glint
 * - Subtle cylindrical-wall grazing lift near the curved PET silhouette
 */
function createPhotorealBubbleMaterial(
  innerBodyR: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uInnerRadius: { value: innerBodyR },
      uTint: { value: new THREE.Color('#f7fbff') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstanceColor;
      varying float vRadialEdge;
      uniform float uInnerRadius;

      void main() {
        #ifdef USE_INSTANCING
          vec4 localInstPos = instanceMatrix * vec4(position, 1.0);
          mat3 instNormalMat = mat3(instanceMatrix);
          vec3 instNormal = normalize(instNormalMat * normal);
          #ifdef USE_INSTANCING_COLOR
            vInstanceColor = instanceColor;
          #else
            vInstanceColor = vec3(1.0);
          #endif
        #else
          vec4 localInstPos = vec4(position, 1.0);
          vec3 instNormal = normal;
          vInstanceColor = vec3(1.0);
        #endif

        vRadialEdge = clamp(abs(localInstPos.x) / max(uInnerRadius, 0.001), 0.0, 1.0);

        vec4 mvPos = modelViewMatrix * localInstPos;
        vNormalView = normalize(normalMatrix * instNormal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uTint;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstanceColor;
      varying float vRadialEdge;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);

        // 1. Air-in-water TIR critical-angle rim (thin bright optical contour, hollow center)
        float tirRim = pow(1.0 - ndv, 3.1);
        float sharpRing = smoothstep(0.56, 0.90, 1.0 - ndv) * smoothstep(1.0, 0.94, 1.0 - ndv);

        // 2. Photographic dark lower-hemisphere shadow rim (reflected dark obsidian void)
        float lowerMask = smoothstep(0.15, -0.78, N.y);
        float darkCrescent = lowerMask * smoothstep(0.18, 0.72, 1.0 - ndv) * (1.0 - sharpRing * 0.65);

        // 3. Razor-sharp pinpoint upper studio catchlights + inverted bottom internal caustic
        vec3 L1 = normalize(vec3(-0.36, 0.80, 0.48));
        vec3 L2 = normalize(vec3(0.58, 0.62, 0.52));
        float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 68.0);
        float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 42.0) * 0.55;
        // Internal refraction caustic spot near the lower pole
        float bottomCaustic = smoothstep(-0.42, -0.88, N.y) * pow(ndv, 1.4) * 0.42;

        // 4. Subtle curved-PET-wall grazing luminance boost near outer silhouette
        float edgeLift = mix(0.86, 1.38, pow(vRadialEdge, 1.35));

        float bright = (tirRim * 0.95 + sharpRing * 0.52 + (spec1 * 1.95 + spec2 * 1.1) + bottomCaustic) * edgeLift;

        // Blend dark lower-hemisphere lensing shadow with crisp colorless white highlights
        vec3 litColor = uTint * vInstanceColor * (0.98 + spec1 * 0.65);
        vec3 shadowColor = vec3(0.03, 0.04, 0.055);
        float highlightMix = clamp(bright / max(bright + darkCrescent * 0.85, 0.001), 0.0, 1.0);
        vec3 color = mix(shadowColor, litColor, highlightMix);

        float alpha = clamp(bright * 0.92 + darkCrescent * 0.58, 0.0, 0.96);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

/**
 * Refractive chilled condensation water-bead shader for micro-droplets clinging
 * to the ice-cold can wall (inspired by Orka reference photo 2).
 */
function createCondensationDropletMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uWaterTint: { value: new THREE.Color('#eef7ff') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstanceColor;

      void main() {
        #ifdef USE_INSTANCING
          vec4 localInstPos = instanceMatrix * vec4(position, 1.0);
          mat3 instNormalMat = mat3(instanceMatrix);
          vec3 instNormal = normalize(instNormalMat * normal);
          #ifdef USE_INSTANCING_COLOR
            vInstanceColor = instanceColor;
          #else
            vInstanceColor = vec3(1.0);
          #endif
        #else
          vec4 localInstPos = vec4(position, 1.0);
          vec3 instNormal = normal;
          vInstanceColor = vec3(1.0);
        #endif

        vec4 mvPos = modelViewMatrix * localInstPos;
        vNormalView = normalize(normalMatrix * instNormal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uWaterTint;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstanceColor;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);

        // Crisp droplet Fresnel ring + upper specular glint + lower caustic glow
        float rim = pow(1.0 - ndv, 2.15);
        vec3 keyDir = normalize(vec3(-0.38, 0.78, 0.50));
        float topSpec = pow(max(dot(reflect(-keyDir, N), V), 0.0), 32.0);
        float bottomCaustic = smoothstep(0.18, -0.72, N.y) * pow(1.0 - ndv, 1.15) * 0.56;

        vec3 col = uWaterTint * vInstanceColor * (0.98 + topSpec * 0.92 + bottomCaustic * 0.68);
        float alpha = clamp((rim * 0.76 + topSpec * 1.25 + bottomCaustic * 0.76) * 0.88, 0.0, 0.94);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

/**
 * Builds the photoreal chilled sparkling mineral water system inside the 12 fl oz PET can,
 * directly matching the 3 Orka reference photos:
 * 1. Real refractive crystal-clear water volume (IOR 1.333, transmission, thickness, zero tint)
 *    + crisp water-PET optical edge-refraction sheath
 * 2. Signature Orka curved teardrop headspace air-pocket dome + concave capillary meniscus
 * 3. Subtle chilled condensation frost micro-mist + glistening cold micro-droplets
 * 4. Authentic sparse sparkling micro-bubbles (vertical punt nucleation chains + clinging pearls)
 */
export function createSparklingWaterSystem(
  overrides?: Partial<BottleTuneParams>
): SparklingWaterSystem {
  const params: BottleTuneParams = {
    ...DEFAULT_BOTTLE_TUNE_PARAMS,
    ...overrides,
  };

  const H = params.bottleHeight;
  const baseY = -H * 0.5;
  const innerBodyR = params.bodyRadius - params.wallThickness - 0.003;
  const innerNeckR = params.neckRadius - params.wallThickness * 0.9 - 0.003;
  const fillNorm = THREE.MathUtils.clamp(params.waterFillLevel, 0.88, 0.935);
  const waterMaxY = baseY + H * fillNorm;

  const group = new THREE.Group();
  group.name = 'BocaSparklingWater';

  // =========================================================================
  // 1. REAL REFRACTIVE CRYSTAL-CLEAR WATER VOLUME (IOR 1.333)
  // =========================================================================
  const liquidPts: THREE.Vector2[] = [];
  const push = (r: number, yNorm: number) => {
    liquidPts.push(new THREE.Vector2(Math.max(0, r), baseY + yNorm * H));
  };

  // Smooth parabolic bottom punt cavity curve (dy/dr = 0 at r = 0, zero V-pinch in macro)
  push(0.0, 0.084);
  push(innerBodyR * 0.08, 0.0837);
  push(innerBodyR * 0.18, 0.0812);
  push(innerBodyR * 0.30, 0.0740);
  push(innerBodyR * 0.44, 0.0605);
  push(innerBodyR * 0.57, 0.0455);
  push(innerBodyR * 0.68, 0.0395);
  push(innerBodyR * 0.78, 0.0440);
  push(innerBodyR * 0.87, 0.0560);
  push(innerBodyR * 0.94, 0.0720);
  push(innerBodyR * 0.985, 0.0900);
  push(innerBodyR, 0.110);
  push(innerBodyR, 0.895);

  const neckSteps = 6;
  for (let i = 1; i <= neckSteps; i++) {
    const yN = THREE.MathUtils.lerp(0.895, fillNorm, i / neckSteps);
    push(sampleLiquidRadiusAtYNorm(yN, innerBodyR, innerNeckR), yN);
  }

  // Realistic concave capillary meniscus climbing slightly up the inner PET wall
  const topR = sampleLiquidRadiusAtYNorm(fillNorm, innerBodyR, innerNeckR);
  push(topR * 0.996, fillNorm + 0.0085);
  push(topR * 0.93, fillNorm + 0.0022);
  push(topR * 0.74, fillNorm - 0.0018);
  push(topR * 0.38, fillNorm - 0.0030);
  push(topR * 0.12, fillNorm - 0.00318);
  push(0.0, fillNorm - 0.0032);

  const liquidGeo = new THREE.LatheGeometry(liquidPts, 80);
  liquidGeo.computeVertexNormals();

  // Explicitly weld bottom punt & top waterline pole normals to eliminate LatheGeometry heart/V-pinch
  const liqPos = liquidGeo.getAttribute('position');
  const liqNorm = liquidGeo.getAttribute('normal');
  for (let i = 0; i < liqPos.count; i++) {
    const px = liqPos.getX(i);
    const py = liqPos.getY(i);
    const pz = liqPos.getZ(i);
    if (Math.hypot(px, pz) < 0.015) {
      if (py < 0) {
        liqNorm.setXYZ(i, 0, -1, 0);
      } else {
        liqNorm.setXYZ(i, 0, 1, 0);
      }
    }
  }
  liqNorm.needsUpdate = true;

  // Genuine physical water refraction (IOR 1.333, crystal clear, zero yellow/gold/purple tint)
  // Low envMapIntensity & zero clearcoat prevent inner-cylinder "straw/tube" strip reflections
  const liquidMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 1.0,
    transmission: THREE.MathUtils.clamp(params.waterTransmission, 0.9, 0.98),
    ior: params.waterIor || 1.333,
    thickness: 0.72,
    roughness: 0.06,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.1,
    specularIntensity: 0.08,
    specularColor: new THREE.Color('#ffffff'),
    envMapIntensity: 0.06,
    attenuationDistance: 7.5,
    attenuationColor: new THREE.Color('#eef7ff'),
    side: THREE.FrontSide,
    depthWrite: false,
  });

  const liquidMesh = new THREE.Mesh(liquidGeo, liquidMaterial);
  liquidMesh.name = 'RefractiveWaterVolume';
  liquidMesh.renderOrder = 1;
  group.add(liquidMesh);

  // 1b. Crisp Water-to-PET Edge Refraction Band (gives the filled liquid real optical boundary)
  const liquidWallH = H * (fillNorm - 0.108);
  const liquidEdgeGeo = new THREE.CylinderGeometry(
    innerBodyR * 0.998,
    innerBodyR * 0.998,
    liquidWallH,
    64,
    1,
    true
  );
  const liquidEdgeMat = createWaterEdgeRefractionMaterial();
  const liquidEdgeMesh = new THREE.Mesh(liquidEdgeGeo, liquidEdgeMat);
  liquidEdgeMesh.name = 'LiquidEdgeRefraction';
  liquidEdgeMesh.position.y = baseY + H * 0.108 + liquidWallH * 0.5;
  liquidEdgeMesh.renderOrder = 2;
  group.add(liquidEdgeMesh);

  // =========================================================================
  // 2. CONCAVE CAPILLARY MENISCUS & SIGNATURE ORKA TEARDROP AIR POCKET
  // =========================================================================
  const meniscusGroup = new THREE.Group();
  meniscusGroup.name = 'MeniscusAndAirPocketGroup';
  meniscusGroup.position.y = waterMaxY;

  // 2a. Physically refined capillary meniscus ring (no synthetic emissive wire)
  // Strictly inset (topR * 0.964) so damped slosh can never clip through the neck taper
  const meniscusRingGeo = new THREE.TorusGeometry(topR * 0.964, 0.0032, 16, 80);
  meniscusRingGeo.rotateX(Math.PI / 2);

  const meniscusMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#eef7ff'),
    emissive: new THREE.Color('#cbe4fa'),
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0.56,
    roughness: 0.03,
    metalness: 0.0,
    ior: 1.333,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.65,
    depthWrite: false,
  });

  const meniscusRing = new THREE.Mesh(meniscusRingGeo, meniscusMaterial);
  meniscusRing.name = 'CapillaryMeniscusRing';
  meniscusRing.renderOrder = 3;
  meniscusGroup.add(meniscusRing);

  // 2b. Subtle non-emissive inner capillary refraction lip beneath the waterline
  const meniscusHaloGeo = new THREE.TorusGeometry(topR * 0.935, 0.0042, 12, 72);
  meniscusHaloGeo.rotateX(Math.PI / 2);
  const meniscusHaloMat = new THREE.MeshBasicMaterial({
    color: 0xdceeff,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  const meniscusHalo = new THREE.Mesh(meniscusHaloGeo, meniscusHaloMat);
  meniscusHalo.position.y = -0.005;
  meniscusHalo.renderOrder = 2;
  meniscusGroup.add(meniscusHalo);

  // 2c. Translucent surface-tension liquid film across the waterline
  const meniscusDiscGeo = new THREE.CircleGeometry(topR * 0.96, 56);
  meniscusDiscGeo.rotateX(-Math.PI / 2);
  const meniscusDiscMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#e8f4ff') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - vec2(0.5)) * 2.0;
        float rimGlow = smoothstep(0.62, 0.96, r) * smoothstep(1.0, 0.97, r) * 0.20;
        float alpha = clamp(0.018 + rimGlow, 0.0, 0.24);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const meniscusDisc = new THREE.Mesh(meniscusDiscGeo, meniscusDiscMat);
  meniscusDisc.position.y = -0.0025;
  meniscusDisc.renderOrder = 2;
  meniscusGroup.add(meniscusDisc);

  // 2d. SIGNATURE ORKA TEARDROP HEADSPACE AIR POCKET (Photos 2 & 3)
  // Smooth closed 3D rotationally symmetric inverted teardrop dome strictly bounded
  // inside innerRadius * 0.72 so it has ZERO deformity or clipping from any 360° angle
  const maxPocketR = Math.min(topR * 0.70, innerNeckR * 0.74);
  const pocketDrop = H * 0.132;
  const airPocketGeo = buildOrkaTeardropAirPocketGeometry(
    maxPocketR,
    pocketDrop
  );

  // Layer A: Physical specular dome catching real studio lighting strips
  const airPocketPhysicalMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f7fbff'),
    transparent: true,
    opacity: 0.11,
    roughness: 0.04,
    metalness: 0.0,
    ior: 1.333,
    clearcoat: 0.65,
    clearcoatRoughness: 0.04,
    specularIntensity: 0.85,
    specularColor: new THREE.Color('#ffffff'),
    envMapIntensity: 1.05,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  // Layer B: Razor-crisp 3D view-dependent Fresnel TIR meniscus boundary
  const airPocketBoundaryMat = createOrkaAirPocketBoundaryMaterial();

  const airPocketPivot = new THREE.Group();
  airPocketPivot.name = 'OrkaHeadspaceAirPocket';

  const airPocketSpecMesh = new THREE.Mesh(airPocketGeo, airPocketPhysicalMat);
  airPocketSpecMesh.renderOrder = 3;
  airPocketPivot.add(airPocketSpecMesh);

  const airPocketRimMesh = new THREE.Mesh(airPocketGeo, airPocketBoundaryMat);
  airPocketRimMesh.scale.setScalar(0.996);
  airPocketRimMesh.renderOrder = 3;
  airPocketPivot.add(airPocketRimMesh);

  meniscusGroup.add(airPocketPivot);
  group.add(meniscusGroup);

  // =========================================================================
  // 3. SUBTLE CHILLED CONDENSATION FROST / MICRO-MIST + FINE WATER DROPLETS
  // =========================================================================
  const { alphaMap: frostAlphaMap, bumpMap: frostBumpMap } =
    createChilledCondensationTextures(fillNorm);

  const mistStartY = baseY + H * 0.105;
  const mistEndY = baseY + H * 0.90;
  const mistH = mistEndY - mistStartY;
  const mistGeo = new THREE.CylinderGeometry(
    params.bodyRadius - 0.0022,
    params.bodyRadius - 0.0022,
    mistH,
    64,
    1,
    true
  );

  const mistMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f2f8ff'),
    transparent: true,
    opacity: 0.115,
    alphaMap: frostAlphaMap,
    bumpMap: frostBumpMap,
    bumpScale: 0.0032,
    roughness: 0.58,
    metalness: 0.0,
    clearcoat: 0.0,
    specularIntensity: 0.14,
    envMapIntensity: 0.12,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  const mistMesh = new THREE.Mesh(mistGeo, mistMat);
  mistMesh.name = 'ChilledCondensationMist';
  mistMesh.position.y = mistStartY + mistH * 0.5;
  mistMesh.renderOrder = 2;
  group.add(mistMesh);

  // 3b. Glistening Chilled Micro-Droplets clinging to the cold surface (Photo 2)
  const rand = createSeededRandom(20261122);
  const tmpColor = new THREE.Color();
  const dropletCount = 135;
  const dropletGeo = new THREE.SphereGeometry(1, 10, 8);
  const dropletMat = createCondensationDropletMaterial();
  const dropletMesh = new THREE.InstancedMesh(
    dropletGeo,
    dropletMat,
    dropletCount
  );
  dropletMesh.name = 'ChilledCondensationDroplets';
  dropletMesh.renderOrder = 3;

  const dropDummy = new THREE.Object3D();
  const dropNormal = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);
  const dropQuat = new THREE.Quaternion();

  for (let i = 0; i < dropletCount; i++) {
    const angle = rand() * Math.PI * 2;
    // Concentrate droplets strictly on the chilled straight cylindrical body (zero shoulder overhang)
    const yNorm = 0.12 + Math.pow(rand(), 0.92) * (Math.min(fillNorm - 0.025, 0.885) - 0.12);
    const isHeroBead = rand() > 0.78;
    const baseR = isHeroBead
      ? 0.0052 + Math.pow(rand(), 1.55) * 0.0050
      : 0.0022 + Math.pow(rand(), 1.75) * 0.0028;

    const surfR = params.bodyRadius - 0.0016;
    const x = Math.cos(angle) * surfR;
    const z = Math.sin(angle) * surfR;
    const y = baseY + yNorm * H;

    dropNormal.set(Math.cos(angle), 0, Math.sin(angle)).normalize();
    dropQuat.setFromUnitVectors(upAxis, dropNormal);

    dropDummy.position.set(x, y, z);
    dropDummy.quaternion.copy(dropQuat);
    // Flattened dome bead along surface normal (local Y after quaternion alignment)
    const verticalStretch = isHeroBead ? 1.24 : 1.06;
    dropDummy.scale.set(baseR, baseR * 0.42, baseR * verticalStretch);
    dropDummy.updateMatrix();
    dropletMesh.setMatrixAt(i, dropDummy.matrix);

    const lum = 0.68 + rand() * 0.32;
    tmpColor.setRGB(lum * 0.95, lum * 0.98, lum);
    dropletMesh.setColorAt(i, tmpColor);
  }
  dropletMesh.instanceMatrix.needsUpdate = true;
  if (dropletMesh.instanceColor) dropletMesh.instanceColor.needsUpdate = true;
  group.add(dropletMesh);

  // =========================================================================
  // 4. AUTHENTIC SPARKLING EFFERVESCENCE (PHOTOREAL OPTICAL-LENSING BUBBLES)
  // =========================================================================
  // Higher-segment sphere (16x12) so hero clinging pearls stay razor-smooth in macro views
  const bubbleGeo = new THREE.SphereGeometry(1, 16, 12);
  const bubbleMaterial = createPhotorealBubbleMaterial(innerBodyR);

  // 4a. Delicate Micro-Bubble Pearls clinging along the Orka air-pocket curve & waterline rim
  const crownCount = 68;
  const crownMesh = new THREE.InstancedMesh(
    bubbleGeo,
    bubbleMaterial,
    crownCount
  );
  crownMesh.name = 'MeniscusEffervescenceCrown';
  crownMesh.renderOrder = 3;

  const crownSeeds: CrownBubbleSeed[] = [];
  for (let i = 0; i < crownCount; i++) {
    const onAirPocket = i < 34;
    const isHeroPearl = rand() > 0.84;
    const sizeRoll = Math.pow(rand(), 2.2);
    crownSeeds.push({
      angle: rand() * Math.PI * 2,
      tArc: 0.15 + rand() * 0.78, // along the 3D Lathe teardrop dome surface
      radialOffset: onAirPocket
        ? 0.99 + rand() * 0.03
        : topR * (0.86 + rand() * 0.075),
      yOffset: onAirPocket
        ? (rand() - 0.5) * 0.008
        : -0.005 - rand() * 0.022,
      radius: isHeroPearl
        ? 0.0032 + rand() * 0.0024
        : 0.00095 + sizeRoll * 0.0021,
      phase: rand() * Math.PI * 2,
      onAirPocket,
    });
    const lum = 0.72 + Math.pow(rand(), 1.2) * 0.28;
    tmpColor.setRGB(lum * 0.97, lum * 0.99, lum);
    crownMesh.setColorAt(i, tmpColor);
  }
  if (crownMesh.instanceColor) crownMesh.instanceColor.needsUpdate = true;
  meniscusGroup.add(crownMesh);

  // 4b. Sparse Champagne-Fine Rising Nucleation Streams from the domed base punt
  // Cap count to keep effervescence authentic & refined (never snowglobe clutter)
  const risingCount = Math.min(Math.max(params.risingBubbleCount, 60), 175);
  const risingMesh = new THREE.InstancedMesh(
    bubbleGeo,
    bubbleMaterial,
    risingCount
  );
  risingMesh.name = 'RisingSparklingBubbles';
  risingMesh.renderOrder = 2;

  const streamCount = 10;
  const streamSites: Array<{ angle: number; radialFactor: number; baseSpeed: number }> = [];
  for (let s = 0; s < streamCount; s++) {
    const baseAngle = (s / streamCount) * Math.PI * 2 + (rand() - 0.5) * 0.32;
    const radialFactor = 0.36 + rand() * 0.54;
    streamSites.push({
      angle: baseAngle,
      radialFactor,
      baseSpeed: 0.044 + rand() * 0.036,
    });
  }

  const risingSeeds: RisingBubbleSeed[] = [];
  for (let i = 0; i < risingCount; i++) {
    const isStream = i < Math.floor(risingCount * 0.74);
    const sizeRoll = Math.pow(rand(), 3.0);

    if (isStream) {
      const site = streamSites[i % streamCount];
      risingSeeds.push({
        angle: site.angle + (rand() - 0.5) * 0.038,
        radialFactor: THREE.MathUtils.clamp(
          site.radialFactor + (rand() - 0.5) * 0.032,
          0.16,
          0.93
        ),
        yNorm: 0.08 + rand() * (fillNorm - 0.095),
        speed:
          (site.baseSpeed + sizeRoll * 0.038 + rand() * 0.01) *
          params.bubbleRiseSpeed,
        radius: 0.00105 + sizeRoll * 0.0028,
        wobbleAmp: 0.0018 + rand() * 0.0036,
        wobbleFreq: 1.6 + rand() * 1.6,
        phase: rand() * Math.PI * 2,
        isStream: true,
      });
    } else {
      risingSeeds.push({
        angle: rand() * Math.PI * 2,
        radialFactor: 0.22 + Math.pow(rand(), 0.78) * 0.72,
        yNorm: 0.085 + rand() * (fillNorm - 0.10),
        speed:
          (0.026 + sizeRoll * 0.058 + rand() * 0.018) * params.bubbleRiseSpeed,
        radius: 0.00095 + sizeRoll * 0.0026,
        wobbleAmp: 0.0026 + rand() * 0.006,
        wobbleFreq: 1.2 + rand() * 1.8,
        phase: rand() * Math.PI * 2,
        isStream: false,
      });
    }

    const lum = 0.52 + Math.pow(rand(), 1.5) * 0.48;
    tmpColor.setRGB(lum * 0.96, lum * 0.99, lum);
    risingMesh.setColorAt(i, tmpColor);
  }
  if (risingMesh.instanceColor) risingMesh.instanceColor.needsUpdate = true;
  group.add(risingMesh);

  // 4c. Organic Clinging Inner-Wall Carbonation Pearls (micro-effervescence + occasional hero pearls)
  const wallCount = Math.min(Math.max(params.wallBubbleCount, 40), 125);
  const wallMesh = new THREE.InstancedMesh(
    bubbleGeo,
    bubbleMaterial,
    wallCount
  );
  wallMesh.name = 'WallCarbonationBubbles';
  wallMesh.renderOrder = 2;

  const wallSeeds: WallBubbleSeed[] = [];
  for (let i = 0; i < wallCount; i++) {
    const isHeroPearl = rand() > 0.82;
    const sizeRoll = Math.pow(rand(), 2.6);
    const yNorm = 0.10 + Math.pow(rand(), 0.95) * (fillNorm - 0.13);
    wallSeeds.push({
      angle: rand() * Math.PI * 2,
      yNorm,
      radius: isHeroPearl
        ? 0.0034 + Math.pow(rand(), 1.5) * 0.0030
        : 0.00085 + sizeRoll * 0.0021,
      phase: rand() * Math.PI * 2,
      shimmerFreq: 0.75 + rand() * 1.5,
    });
    const lum = isHeroPearl
      ? 0.82 + rand() * 0.18
      : 0.48 + Math.pow(rand(), 1.5) * 0.52;
    tmpColor.setRGB(lum * 0.95, lum * 0.99, lum);
    wallMesh.setColorAt(i, tmpColor);
  }
  if (wallMesh.instanceColor) wallMesh.instanceColor.needsUpdate = true;
  group.add(wallMesh);

  // =========================================================================
  // 5. DAMPED 2ND-ORDER LIQUID SLOSH & AIR-POCKET BUOYANCY UPDATE
  // =========================================================================
  const dummy = new THREE.Object3D();
  let smoothedVelocity = 0;
  let sloshX = 0;
  let sloshVelX = 0;
  let sloshZ = 0;
  let sloshVelZ = 0;
  let pocketOffsetX = 0;
  let pocketOffsetZ = 0;

  const update = (time: number, dt: number, scroll: ScrollState) => {
    const clampedDt = Math.min(Math.max(dt, 0.001), 0.045);
    const targetVel = THREE.MathUtils.clamp(scroll.velocity, -4, 4);
    smoothedVelocity = THREE.MathUtils.lerp(
      smoothedVelocity,
      targetVel,
      1 - Math.exp(-clampedDt * 5.5)
    );

    // Tightly clamped 2nd-order damped slosh so meniscus & air pocket never clip outer PET wall
    const targetSloshX =
      THREE.MathUtils.clamp(smoothedVelocity * 0.018, -0.036, 0.036) -
      scroll.pointerY * 0.014 +
      Math.sin(time * 1.1) * 0.004;
    const targetSloshZ =
      -scroll.pointerX * 0.016 + Math.cos(time * 0.88) * 0.004;

    const kSlosh = 18.0;
    const dSlosh = 5.4;
    sloshVelX += ((targetSloshX - sloshX) * kSlosh - sloshVelX * dSlosh) * clampedDt;
    sloshVelZ += ((targetSloshZ - sloshZ) * kSlosh - sloshVelZ * dSlosh) * clampedDt;
    sloshX = THREE.MathUtils.clamp(sloshX + sloshVelX * clampedDt, -0.042, 0.042);
    sloshZ = THREE.MathUtils.clamp(sloshZ + sloshVelZ * clampedDt, -0.042, 0.042);

    meniscusGroup.rotation.x = sloshX;
    meniscusGroup.rotation.z = sloshZ;

    // Gentle bounded lateral buoyancy drift strictly inside the centered safe envelope
    const maxDrift = topR * 0.035;
    const targetDriftX = THREE.MathUtils.clamp(
      Math.sin(time * 0.42) * maxDrift * 0.45 - sloshZ * 0.35,
      -maxDrift,
      maxDrift
    );
    const targetDriftZ = THREE.MathUtils.clamp(
      Math.cos(time * 0.36) * maxDrift * 0.45 + sloshX * 0.35,
      -maxDrift,
      maxDrift
    );
    const driftAlpha = 1 - Math.exp(-clampedDt * 4.5);
    pocketOffsetX = THREE.MathUtils.lerp(pocketOffsetX, targetDriftX, driftAlpha);
    pocketOffsetZ = THREE.MathUtils.lerp(pocketOffsetZ, targetDriftZ, driftAlpha);
    airPocketPivot.position.set(pocketOffsetX, 0, pocketOffsetZ);

    // Update meniscus crown pearls & micro-bubbles clinging around the 3D teardrop dome
    for (let i = 0; i < crownCount; i++) {
      const c = crownSeeds[i];
      const pulse = 0.90 + Math.sin(time * 1.3 + c.phase) * 0.11;
      const s = c.radius * pulse;
      if (c.onAirPocket) {
        const rSurf = sampleAirPocketRadius(c.tArc, maxPocketR) * c.radialOffset;
        const theta = c.angle + time * 0.018;
        const y = -0.004 - c.tArc * pocketDrop + c.yOffset + Math.sin(time * 1.0 + c.phase) * 0.0012;
        dummy.position.set(
          pocketOffsetX + Math.cos(theta) * rSurf,
          y,
          pocketOffsetZ + Math.sin(theta) * rSurf
        );
      } else {
        dummy.position.set(
          Math.cos(c.angle + time * 0.022) * c.radialOffset,
          c.yOffset + Math.sin(time * 1.2 + c.phase) * 0.0015,
          Math.sin(c.angle + time * 0.022) * c.radialOffset
        );
      }
      dummy.scale.setScalar(s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      crownMesh.setMatrixAt(i, dummy.matrix);
    }
    crownMesh.instanceMatrix.needsUpdate = true;

    const agitation = 1 + Math.min(Math.abs(smoothedVelocity) * 0.75, 1.8);

    // Update champagne-fine rising nucleation streams
    for (let i = 0; i < risingCount; i++) {
      const b = risingSeeds[i];
      b.yNorm += b.speed * agitation * clampedDt;
      if (b.yNorm >= fillNorm - 0.008) {
        b.yNorm = 0.078 + (b.yNorm - (fillNorm - 0.008)) * 0.25;
      }

      const maxR =
        sampleLiquidRadiusAtYNorm(b.yNorm, innerBodyR, innerNeckR) - b.radius * 2.2;
      const r = Math.max(0.008, maxR * b.radialFactor);

      const waveScale = b.isStream ? 0.055 : 0.12;
      const theta =
        b.angle + Math.sin(time * b.wobbleFreq + b.yNorm * 13.0 + b.phase) * waveScale;
      const wobbleR =
        r + Math.cos(time * (b.wobbleFreq * 0.85) + b.phase) * b.wobbleAmp;

      const x = Math.cos(theta) * wobbleR;
      const z = Math.sin(theta) * wobbleR;
      const y = baseY + b.yNorm * H;

      const buoyancyGrowth = 0.86 + 0.28 * ((b.yNorm - 0.078) / (fillNorm - 0.078));
      const bottomFade = THREE.MathUtils.smoothstep(b.yNorm, 0.078, 0.122);
      const topFade =
        1 - THREE.MathUtils.smoothstep(b.yNorm, fillNorm - 0.032, fillNorm - 0.005);
      const scale = b.radius * buoyancyGrowth * bottomFade * topFade;

      // Larger rising bubbles flatten slightly (oblate spheroid) from upward fluid drag
      const oblateY = b.radius > 0.0024 ? 0.93 : 1.04;
      const oblateXZ = b.radius > 0.0024 ? 1.05 : 1.0;
      dummy.position.set(x, y, z);
      dummy.scale.set(
        scale * oblateXZ,
        scale * (oblateY + (agitation - 1) * 0.06),
        scale * oblateXZ
      );
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      risingMesh.setMatrixAt(i, dummy.matrix);
    }
    risingMesh.instanceMatrix.needsUpdate = true;

    // Update organic clinging inner-wall carbonation pearls (subtle wall-lens elongation)
    for (let i = 0; i < wallCount; i++) {
      const w = wallSeeds[i];
      const wallR =
        sampleLiquidRadiusAtYNorm(w.yNorm, innerBodyR, innerNeckR) -
        w.radius * 0.75;
      const x = Math.cos(w.angle) * wallR;
      const z = Math.sin(w.angle) * wallR;
      const y = baseY + w.yNorm * H;

      const pulse = 0.92 + Math.sin(time * w.shimmerFreq + w.phase) * 0.09;
      const s = w.radius * pulse;
      // Subtle optical vertical stretch near curved wall silhouette
      const edgeStretchY = 1.04 + Math.abs(Math.cos(w.angle)) * 0.08;

      dummy.position.set(x, y, z);
      dummy.scale.set(s, s * edgeStretchY, s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      wallMesh.setMatrixAt(i, dummy.matrix);
    }
    wallMesh.instanceMatrix.needsUpdate = true;
  };

  update(0, 0.016, {
    progress: 0,
    rawProgress: 0,
    velocity: 0,
    section: 'hero',
    sectionProgress: 0,
    pointerX: 0,
    pointerY: 0,
  });

  const dispose = () => {
    liquidGeo.dispose();
    liquidMaterial.dispose();
    liquidEdgeGeo.dispose();
    liquidEdgeMat.dispose();
    meniscusRingGeo.dispose();
    meniscusMaterial.dispose();
    meniscusHaloGeo.dispose();
    meniscusHaloMat.dispose();
    meniscusDiscGeo.dispose();
    meniscusDiscMat.dispose();
    airPocketGeo.dispose();
    airPocketPhysicalMat.dispose();
    airPocketBoundaryMat.dispose();
    mistGeo.dispose();
    mistMat.dispose();
    frostAlphaMap.dispose();
    frostBumpMap.dispose();
    dropletGeo.dispose();
    dropletMat.dispose();
    bubbleGeo.dispose();
    bubbleMaterial.dispose();
  };

  return {
    group,
    update,
    dispose,
  };
}

export const createSparklingWater = createSparklingWaterSystem;
