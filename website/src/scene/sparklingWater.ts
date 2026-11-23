import * as THREE from 'three';
import {
  DEFAULT_BOTTLE_TUNE_PARAMS,
  type BottleTuneParams,
  type ScrollState,
} from './types';

export interface SparklingWaterSystem {
  /** Root group placed inside the sleek 12 fl oz PET can assembly */
  group: THREE.Group;
  /** Set normalized water fill level (0 = empty at base punt, 1 = full waterline) for opening fill loader */
  setFillLevel: (level: number) => void;
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
  yNorm: number;
  x: number;
  y: number;
  z: number;
  edgeStretchY: number;
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

interface DrippingBeadSeed {
  cosA: number;
  sinA: number;
  yaw: number;
  yNorm: number;
  baseSpeed: number;
  slipFreq: number;
  slipPhase: number;
  radius: number;
  trailLen: number;
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
      uOpacityScale: { value: 1.0 },
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
      uniform float uOpacityScale;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);

        // True 3D view-dependent grazing TIR meniscus rim (delicate, zero milky fill)
        float fresnelRim = pow(1.0 - ndv, 3.0);
        float crispEdge = smoothstep(0.60, 0.94, 1.0 - ndv);

        // Dual studio catchlights (upper-left & upper-right studio scrims)
        vec3 L1 = normalize(vec3(-0.42, 0.78, 0.46));
        vec3 L2 = normalize(vec3(0.52, 0.68, 0.52));
        float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 48.0);
        float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 36.0) * 0.55;

        // Soft fade right at the flat top cap where the dome merges into the waterline
        float topFade = smoothstep(-0.002, -0.014, vLocalPos.y);

        float luminance = (fresnelRim * 0.52 + crispEdge * 0.24 + (spec1 + spec2) * 0.62) * topFade;
        vec3 col = mix(uTintColor, uSpecColor, clamp(crispEdge * 0.85 + spec1 + spec2, 0.0, 1.0));
        float alpha = clamp(luminance * 0.42, 0.0, 0.40) * uOpacityScale;

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
      uBeat2Focus: { value: 0.0 },
      uDarkMix: { value: 1.0 },
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
      uniform float uBeat2Focus;
      uniform float uDarkMix;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstanceColor;
      varying float vRadialEdge;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);

        // Beat 2 close-up macro visibility & catchlight boost (+42% crisp optical presence)
        float focusBoost = 1.0 + uBeat2Focus * 0.42;

        // 1. Air-in-water TIR critical-angle rim (thin bright optical contour, hollow center)
        float tirRim = pow(1.0 - ndv, 3.1);
        float sharpRing = smoothstep(0.56, 0.90, 1.0 - ndv) * smoothstep(1.0, 0.94, 1.0 - ndv);

        // 2. Photographic dark lower-hemisphere shadow rim (reflected dark void / crisp light-mode refraction)
        float lowerMask = smoothstep(0.15, -0.78, N.y);
        float darkCrescent = lowerMask * smoothstep(0.18, 0.72, 1.0 - ndv) * (1.0 - sharpRing * 0.65);
        float lightModeRim = (1.0 - uDarkMix) * (tirRim * 0.52 + sharpRing * 0.36);

        // 3. Razor-sharp pinpoint upper studio catchlights + inverted bottom internal caustic
        vec3 L1 = normalize(vec3(-0.36, 0.80, 0.48));
        vec3 L2 = normalize(vec3(0.58, 0.62, 0.52));
        float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 64.0);
        float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 40.0) * 0.58;
        // Internal refraction caustic spot near the lower pole
        float bottomCaustic = smoothstep(-0.42, -0.88, N.y) * pow(ndv, 1.4) * 0.45;

        // 4. Subtle curved-PET-wall grazing luminance boost near outer silhouette
        float edgeLift = mix(0.88, 1.40, pow(vRadialEdge, 1.3));

        float bright = (tirRim * 0.96 + sharpRing * 0.54 + (spec1 * 2.0 + spec2 * 1.15) + bottomCaustic) * edgeLift * focusBoost;

        // Blend crisp dark lensing shadow (enhanced in Light Mode so bubbles read clearly on white) with pure white highlights
        vec3 litColor = uTint * vInstanceColor * (0.98 + spec1 * 0.68);
        vec3 shadowColor = mix(vec3(0.12, 0.15, 0.19), vec3(0.03, 0.04, 0.055), uDarkMix);
        float darkWeight = (darkCrescent * mix(1.05, 0.85, uDarkMix) + lightModeRim) * focusBoost;
        float highlightMix = clamp(bright / max(bright + darkWeight, 0.001), 0.0, 1.0);
        vec3 color = mix(shadowColor, litColor, highlightMix);

        float alpha = clamp(bright * 0.92 + darkWeight * mix(0.76, 0.58, uDarkMix), 0.0, 0.97);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

/**
 * Builds an organic 3D flattened teardrop water-drip dome (bulbous lower head
 * tapering smoothly upward into a pointed wet tail) oriented with +Z pointing
 * radially outward from the can wall and +Y pointing up along the cylinder axis.
 */
function buildTeardropDripGeometry(): THREE.BufferGeometry {
  const segU = 18;
  const segV = 14;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = bottom bulbous tip, 1 = upper tapered tail tip
    // Vertical span: bulbous head sits around y in [-1.0 .. +0.3], tail reaches +1.65
    const y = THREE.MathUtils.lerp(-1.0, 1.65, v);
    // Asymmetric teardrop width profile: full rounded belly at v ~ 0.28, slim tail toward v = 1
    const belly = Math.sin(Math.pow(v, 0.72) * Math.PI);
    const tailTaper = Math.pow(Math.max(0, 1 - v), 0.55);
    const halfWidth = belly * (0.62 + 0.45 * tailTaper);
    // Outward dome height (deepest at bulbous lower head, thinning into surface along tail)
    const domeDepth = belly * (0.34 + 0.30 * tailTaper);

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU; // 0..1 across semicircle from -X to +X
      const phi = u * Math.PI; // 0 .. PI
      const x = -Math.cos(phi) * halfWidth;
      const z = Math.sin(phi) * domeDepth; // >= 0 outward from wall
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = a + stride;
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
 * Refractive chilled condensation water-bead shader for outer surface micro-beads
 * and gravity-dripping teardrops sitting ON TOP of the clear PET wall & BOCA/WATER logo.
 * Supports both Dark Mode and Light Mode via uDarkMix with crisp dark bottom contact
 * refraction + razor upper studio catchlight + lower convex-lens caustic focus.
 */
function createCondensationDropletMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uWaterTint: { value: new THREE.Color('#f4faff') },
      uDarkMix: { value: 1.0 },
      uOpacityScale: { value: 1.0 },
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
      uniform float uDarkMix;
      uniform float uOpacityScale;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vInstanceColor;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);

        // 1. Crisp optical water-bead Fresnel contour
        float rim = pow(1.0 - ndv, 2.25);

        // 2. Pinpoint upper-left studio specular catchlight + convex-lens bottom caustic focus
        vec3 keyDir = normalize(vec3(-0.36, 0.80, 0.48));
        vec3 fillDir = normalize(vec3(0.54, 0.58, 0.60));
        float topSpec = pow(max(dot(reflect(-keyDir, N), V), 0.0), 52.0);
        float sideSpec = pow(max(dot(reflect(-fillDir, N), V), 0.0), 32.0) * 0.45;
        float bottomCaustic = smoothstep(0.05, -0.78, N.y) * pow(1.0 - ndv, 0.85) * 0.68;

        // 3. Dark bottom refraction / contact shadow crescent (makes drops visibly sit ON TOP of BOCA/WATER!)
        float contactShadow = smoothstep(0.28, -0.68, N.y) * smoothstep(0.12, 0.72, 1.0 - ndv) * 0.85;
        float lightEdge = (1.0 - uDarkMix) * rim * 0.65;

        float bright = (rim * mix(0.54, 0.96, uDarkMix) + topSpec * 2.15 + sideSpec * 1.15 + bottomCaustic * 1.18);
        float darkW = (contactShadow * mix(1.24, 0.92, uDarkMix) + lightEdge * 1.22);

        vec3 litCol = uWaterTint * vInstanceColor * (1.02 + topSpec * 0.92 + bottomCaustic * 0.52);
        vec3 darkCol = mix(vec3(0.09, 0.12, 0.16), vec3(0.02, 0.03, 0.045), uDarkMix);
        float mixT = clamp(bright / max(bright + darkW, 0.001), 0.0, 1.0);
        vec3 col = mix(darkCol, litCol, mixT);

        float alpha = clamp(bright * 0.96 + darkW * mix(0.84, 0.72, uDarkMix), 0.0, 0.97) * uOpacityScale;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

/**
 * Ultra-subtle glistening wet slip-trail ribbon left behind each gravity-dripping bead.
 */
function createDripTrailMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDarkMix: { value: 1.0 },
      uOpacityScale: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        #ifdef USE_INSTANCING
          vec4 localInstPos = instanceMatrix * vec4(position, 1.0);
        #else
          vec4 localInstPos = vec4(position, 1.0);
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * localInstPos;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uDarkMix;
      uniform float uOpacityScale;
      varying vec2 vUv;
      void main() {
        // Tapered slim wet streak: strongest right behind the bead (vUv.y -> 0), fading gently upward
        float xDist = abs(vUv.x - 0.5) * 2.0;
        float widthMask = smoothstep(1.0, 0.12, xDist);
        float yMask = smoothstep(1.0, 0.08, vUv.y) * smoothstep(0.0, 0.10, vUv.y);
        // Subtle twin specular edges along the wet trail
        float edgeSheen = smoothstep(0.25, 0.78, xDist) * widthMask;
        vec3 col = mix(vec3(0.26, 0.31, 0.37), vec3(0.92, 0.96, 1.0), uDarkMix);
        float alpha = clamp((widthMask * 0.20 + edgeSheen * 0.30) * yMask * mix(0.68, 0.88, uDarkMix), 0.0, 0.44) * uOpacityScale;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
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

  const puntTopNorm = 0.088;
  const puntTopY = baseY + H * puntTopNorm;
  const waterColumnPivot = new THREE.Group();
  waterColumnPivot.name = 'WaterColumnPivot';
  waterColumnPivot.position.y = puntTopY;
  group.add(waterColumnPivot);

  const liquidMesh = new THREE.Mesh(liquidGeo, liquidMaterial);
  liquidMesh.name = 'RefractiveWaterVolume';
  liquidMesh.position.y = -puntTopY;
  liquidMesh.renderOrder = 1;
  waterColumnPivot.add(liquidMesh);

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
  liquidEdgeMesh.position.y = baseY + H * 0.108 + liquidWallH * 0.5 - puntTopY;
  liquidEdgeMesh.renderOrder = 2;
  waterColumnPivot.add(liquidEdgeMesh);

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

  // 2d. SLIM HEADSPACE AIR-POCKET MENISCUS DOME (strictly high in upper shoulder, clear of BOCA)
  // Raised & slimmed (pocketDrop: 0.048H) with ultra-subtle translucent rim so it sits
  // completely above the 'A' in BOCA with zero milky refraction overlap behind typography
  const maxPocketR = Math.min(topR * 0.62, innerNeckR * 0.66);
  const pocketDrop = H * 0.048;
  const airPocketGeo = buildOrkaTeardropAirPocketGeometry(
    maxPocketR,
    pocketDrop
  );

  // Layer A: Ultra-subtle physical specular dome (no milky white dome fill)
  const airPocketPhysicalMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f7fbff'),
    transparent: true,
    opacity: 0.045,
    roughness: 0.04,
    metalness: 0.0,
    ior: 1.333,
    clearcoat: 0.45,
    clearcoatRoughness: 0.04,
    specularIntensity: 0.55,
    specularColor: new THREE.Color('#ffffff'),
    envMapIntensity: 0.62,
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

  // 3b. Glistening Outer Chilled Micro-Beads sitting ON TOP of PET glass & BOCA/WATER logo
  const rand = createSeededRandom(20261122);
  const tmpColor = new THREE.Color();
  const dropletCount = 165;
  const dropletGeo = new THREE.SphereGeometry(1, 14, 10);
  const dropletMat = createCondensationDropletMaterial();
  const dropletMesh = new THREE.InstancedMesh(
    dropletGeo,
    dropletMat,
    dropletCount
  );
  dropletMesh.name = 'ChilledCondensationDroplets';
  // Render strictly ON TOP of PET outer shell and matte-satin BOCA/WATER wordmark stickers
  dropletMesh.renderOrder = 14;
  dropletMesh.frustumCulled = false;

  const dropDummy = new THREE.Object3D();
  const dropNormal = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);
  const dropQuat = new THREE.Quaternion();
  const outerBeadR = params.bodyRadius + 0.0078;

  for (let i = 0; i < dropletCount; i++) {
    // Bias ~45% of droplets across front (0 deg, BOCA) & back (180 deg, WATER) logo arcs
    // so zoomed-in views clearly show chilled water beads sitting ON TOP of the typography
    let angle: number;
    if (i < Math.floor(dropletCount * 0.25)) {
      angle = Math.PI * 0.5 + (rand() - 0.5) * 0.82; // front +Z logo arc (sin = +1)
    } else if (i < Math.floor(dropletCount * 0.45)) {
      angle = -Math.PI * 0.5 + (rand() - 0.5) * 0.82; // back -Z logo arc (sin = -1)
    } else {
      angle = rand() * Math.PI * 2;
    }

    // Strictly on the chilled straight cylindrical body (zero shoulder overhang)
    const yNorm = 0.118 + Math.pow(rand(), 0.94) * (Math.min(fillNorm - 0.03, 0.880) - 0.118);
    const isHeroBead = rand() > 0.72;
    const baseR = isHeroBead
      ? 0.0056 + Math.pow(rand(), 1.45) * 0.0054
      : 0.0022 + Math.pow(rand(), 1.7) * 0.0030;

    const x = Math.cos(angle) * outerBeadR;
    const z = Math.sin(angle) * outerBeadR;
    const y = baseY + yNorm * H;

    dropNormal.set(Math.cos(angle), 0, Math.sin(angle)).normalize();
    dropQuat.setFromUnitVectors(upAxis, dropNormal);

    dropDummy.position.set(x, y, z);
    dropDummy.quaternion.copy(dropQuat);
    // Flattened dome bead along outward radial normal (local Y after quaternion alignment)
    const verticalStretch = isHeroBead ? 1.24 : 1.08;
    dropDummy.scale.set(baseR, baseR * 0.46, baseR * verticalStretch);
    dropDummy.updateMatrix();
    dropletMesh.setMatrixAt(i, dropDummy.matrix);

    const lum = 0.74 + rand() * 0.26;
    tmpColor.setRGB(lum * 0.96, lum * 0.99, lum);
    dropletMesh.setColorAt(i, tmpColor);
  }
  dropletMesh.instanceMatrix.needsUpdate = true;
  if (dropletMesh.instanceColor) dropletMesh.instanceColor.needsUpdate = true;
  group.add(dropletMesh);

  // 3c. 16 Animated Gravity-Dripping Teardrop Water Beads + Slim Wet Slip-Trails
  // Placed strictly outside the PET wall & BOCA/WATER wordmark (outerRadius + 0.009, renderOrder 14)
  const dripCount = 16;
  const dripGeo = buildTeardropDripGeometry();
  const dripMesh = new THREE.InstancedMesh(dripGeo, dropletMat, dripCount);
  dripMesh.name = 'DrippingWaterBeads';
  dripMesh.renderOrder = 14;
  dripMesh.frustumCulled = false;

  const dripTrailGeo = new THREE.PlaneGeometry(1, 1);
  // Shift pivot to bottom edge so the trail extends cleanly UPWARD behind the falling bead
  dripTrailGeo.translate(0, 0.5, 0);
  const dripTrailMat = createDripTrailMaterial();
  const dripTrailMesh = new THREE.InstancedMesh(
    dripTrailGeo,
    dripTrailMat,
    dripCount
  );
  dripTrailMesh.name = 'DrippingWaterTrails';
  dripTrailMesh.renderOrder = 13;
  dripTrailMesh.frustumCulled = false;

  const dripSeeds: DrippingBeadSeed[] = [];
  for (let i = 0; i < dripCount; i++) {
    // Distribute 6 drips across front BOCA (+Z), 5 across back WATER (-Z), and 5 on sides
    let angle: number;
    if (i < 6) {
      angle = Math.PI * 0.5 + ((i - 2.5) / 5.5) * 0.72 + (rand() - 0.5) * 0.08;
    } else if (i < 11) {
      angle = -Math.PI * 0.5 + ((i - 8.0) / 4.5) * 0.72 + (rand() - 0.5) * 0.08;
    } else {
      angle = rand() * Math.PI * 2;
    }
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    dripSeeds.push({
      cosA,
      sinA,
      yaw: Math.atan2(cosA, sinA),
      yNorm: 0.18 + rand() * 0.66,
      baseSpeed: 0.011 + rand() * 0.012, // slow realistic gravity trickle
      slipFreq: 0.45 + rand() * 0.55,
      slipPhase: rand() * Math.PI * 2,
      radius: 0.0075 + rand() * 0.0052,
      trailLen: 0.09 + rand() * 0.14,
    });
    const lum = 0.82 + rand() * 0.18;
    tmpColor.setRGB(lum * 0.96, lum * 0.99, lum);
    dripMesh.setColorAt(i, tmpColor);
  }
  if (dripMesh.instanceColor) dripMesh.instanceColor.needsUpdate = true;
  group.add(dripTrailMesh);
  group.add(dripMesh);

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
  crownMesh.frustumCulled = false;

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
  risingMesh.frustumCulled = false;

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
  wallMesh.frustumCulled = false;

  const wallSeeds: WallBubbleSeed[] = [];
  for (let i = 0; i < wallCount; i++) {
    const isHeroPearl = rand() > 0.82;
    const sizeRoll = Math.pow(rand(), 2.6);
    const angle = rand() * Math.PI * 2;
    const yNorm = 0.10 + Math.pow(rand(), 0.95) * (fillNorm - 0.13);
    const radius = isHeroPearl
      ? 0.0034 + Math.pow(rand(), 1.5) * 0.0030
      : 0.00085 + sizeRoll * 0.0021;
    const wallR =
      sampleLiquidRadiusAtYNorm(yNorm, innerBodyR, innerNeckR) - radius * 0.75;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    wallSeeds.push({
      yNorm,
      x: cosA * wallR,
      y: baseY + yNorm * H,
      z: sinA * wallR,
      edgeStretchY: 1.04 + Math.abs(cosA) * 0.08,
      radius,
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
  // 5. OPENING FILL-LEVEL CONTROLLER & DAMPED 2ND-ORDER LIQUID SLOSH UPDATE
  // =========================================================================
  const dummy = new THREE.Object3D();
  let currentFillLevel = 1.0;
  let activeFillNorm = fillNorm;
  let activeTopR = topR;
  let smoothedVelocity = 0;
  let sloshX = 0;
  let sloshVelX = 0;
  let sloshZ = 0;
  let sloshVelZ = 0;
  let pocketOffsetX = 0;
  let pocketOffsetZ = 0;

  const setFillLevel = (level: number) => {
    const clamped = THREE.MathUtils.clamp(level, 0, 1);
    currentFillLevel = clamped;
    activeFillNorm = THREE.MathUtils.lerp(puntTopNorm + 0.012, fillNorm, clamped);
    const activeWaterY = baseY + H * activeFillNorm;
    activeTopR = sampleLiquidRadiusAtYNorm(activeFillNorm, innerBodyR, innerNeckR);

    // Smoothly scale the water column upward from the domed base punt
    waterColumnPivot.visible = clamped > 0.004;
    waterColumnPivot.scale.set(1, Math.max(0.004, clamped), 1);

    // Ride the meniscus assembly directly on top of the rising waterline
    meniscusGroup.visible = clamped > 0.008;
    meniscusGroup.position.y = activeWaterY;
    const radialScale = activeTopR / Math.max(topR, 0.001);
    meniscusRing.scale.set(radialScale, 1, radialScale);
    meniscusHalo.scale.set(radialScale, 1, radialScale);
    meniscusDisc.scale.set(radialScale, 1, radialScale);

    // Gently bloom Orka headspace air pocket as liquid reaches the upper shoulder (0.84 -> 1.0)
    const pocketReveal = THREE.MathUtils.smoothstep(clamped, 0.84, 1.0);
    airPocketPivot.visible = pocketReveal > 0.01;
    airPocketPivot.scale.setScalar(0.55 + 0.45 * pocketReveal);
    airPocketPhysicalMat.opacity = 0.045 * pocketReveal;
    airPocketBoundaryMat.uniforms.uOpacityScale.value = pocketReveal;

    // Gently condense outer chilled mist, micro-beads & dripping trails as can finishes filling (0.82 -> 1.0)
    const chillReveal = THREE.MathUtils.smoothstep(clamped, 0.82, 1.0);
    mistMesh.visible = chillReveal > 0.01;
    mistMat.opacity = 0.115 * chillReveal;
    dropletMat.uniforms.uOpacityScale.value = chillReveal;
    dripTrailMat.uniforms.uOpacityScale.value = chillReveal;
    dropletMesh.visible = chillReveal > 0.01;
    dripMesh.visible = chillReveal > 0.01;
    dripTrailMesh.visible = chillReveal > 0.01;
  };

  setFillLevel(1.0);

  const update = (time: number, dt: number, scroll: ScrollState) => {
    const clampedDt = Math.min(Math.max(dt, 0.001), 0.045);
    const targetVel = THREE.MathUtils.clamp(scroll.velocity, -4, 4);
    smoothedVelocity = THREE.MathUtils.lerp(
      smoothedVelocity,
      targetVel,
      1 - Math.exp(-clampedDt * 5.5)
    );

    const isFilling = currentFillLevel < 0.96;
    const fillFizz = isFilling ? Math.sin(currentFillLevel * Math.PI) : 0;

    // Tightly clamped 2nd-order damped slosh so meniscus & air pocket never clip outer PET wall
    const targetSloshX =
      THREE.MathUtils.clamp(smoothedVelocity * 0.018, -0.036, 0.036) -
      scroll.pointerY * 0.014 +
      Math.sin(time * (isFilling ? 6.2 : 1.1)) * (0.004 + fillFizz * 0.018);
    const targetSloshZ =
      -scroll.pointerX * 0.016 +
      Math.cos(time * (isFilling ? 5.1 : 0.88)) * (0.004 + fillFizz * 0.016);

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
    const crownRadialScale = activeTopR / Math.max(topR, 0.001);
    const pocketPearlScale = THREE.MathUtils.smoothstep(currentFillLevel, 0.84, 1.0);
    for (let i = 0; i < crownCount; i++) {
      const c = crownSeeds[i];
      const pulse = 0.90 + Math.sin(time * 1.3 + c.phase) * 0.11;
      const s = c.radius * pulse * (c.onAirPocket ? pocketPearlScale : 1.0 + fillFizz * 0.25);
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
        const rCrown = c.radialOffset * crownRadialScale;
        dummy.position.set(
          Math.cos(c.angle + time * 0.022) * rCrown,
          c.yOffset + Math.sin(time * 1.2 + c.phase) * 0.0015,
          Math.sin(c.angle + time * 0.022) * rCrown
        );
      }
      dummy.scale.setScalar(s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      crownMesh.setMatrixAt(i, dummy.matrix);
    }
    crownMesh.instanceMatrix.needsUpdate = true;

    const agitation = 1 + Math.min(Math.abs(smoothedVelocity) * 0.75, 1.8) + fillFizz * 1.45;

    // Smooth Beat 2 bell envelope (centered at scroll.progress ≈ 0.333: "From the mouth of the earth.")
    // Energizes upward sparkling nucleation streams, buoyant swell & optical catchlights cleanly
    const beat2Focus = Math.exp(-Math.pow((scroll.progress - 0.333) / 0.17, 2));
    const darkMix =
      typeof scroll.darkMix === 'number'
        ? scroll.darkMix
        : scroll.theme === 'light'
          ? 0.0
          : 1.0;
    bubbleMaterial.uniforms.uBeat2Focus.value = Math.max(beat2Focus, fillFizz * 0.65);
    bubbleMaterial.uniforms.uDarkMix.value = darkMix;
    dropletMat.uniforms.uDarkMix.value = darkMix;
    dripTrailMat.uniforms.uDarkMix.value = darkMix;

    // Update 16 animated stick-slip gravity-dripping teardrop beads + slim wet trails
    // Strictly outside the PET wall & BOCA/WATER wordmark (outerDripR = bodyRadius + 0.009)
    const outerDripR = params.bodyRadius + 0.009;
    const outerTrailR = params.bodyRadius + 0.0082;
    const dripTopY = 0.872;
    const dripBotY = 0.120;
    for (let i = 0; i < dripCount; i++) {
      const d = dripSeeds[i];
      // Stick-slip gravity pulse: pauses briefly under surface tension, then glides downward
      const slipWave = 0.5 + 0.5 * Math.sin(time * d.slipFreq + d.slipPhase);
      const stickSlip = 0.18 + 0.82 * Math.pow(slipWave, 2.4);
      d.yNorm -= d.baseSpeed * stickSlip * clampedDt;
      if (d.yNorm <= dripBotY) {
        d.yNorm = dripTopY - (dripBotY - d.yNorm) * 0.15;
      }

      const topFade = THREE.MathUtils.smoothstep(d.yNorm, dripTopY, dripTopY - 0.055);
      const botFade = THREE.MathUtils.smoothstep(d.yNorm, dripBotY, dripBotY + 0.055);
      const env = topFade * botFade;

      // Orient outward (+Z of teardrop geometry -> radial normal on cylinder, precomputed trig)
      const x = d.cosA * outerDripR;
      const z = d.sinA * outerDripR;
      const y = baseY + d.yNorm * H;

      const s = d.radius * env;
      // Subtle vertical stretch while actively gliding downward
      const stretchY = 1.0 + stickSlip * 0.22;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, d.yaw, 0);
      dummy.scale.set(s, s * stretchY, s);
      dummy.updateMatrix();
      dripMesh.setMatrixAt(i, dummy.matrix);

      // Slim glistening wet trail extending upward behind the falling bead
      const traveledH = Math.min(d.trailLen, Math.max(0.01, (dripTopY - d.yNorm) * H));
      dummy.position.set(
        d.cosA * outerTrailR,
        y + s * 0.45,
        d.sinA * outerTrailR
      );
      dummy.rotation.set(0, d.yaw, 0);
      dummy.scale.set(d.radius * 0.62 * env, traveledH * env, 1);
      dummy.updateMatrix();
      dripTrailMesh.setMatrixAt(i, dummy.matrix);
    }
    dripMesh.instanceMatrix.needsUpdate = true;
    dripTrailMesh.instanceMatrix.needsUpdate = true;

    const beat2SpeedMul = 1.0 + beat2Focus * 0.85; // ~1.85x lively vertical ascent on Beat 2
    const activeCeilingNorm = Math.max(puntTopNorm + 0.014, activeFillNorm - 0.008);

    // Update champagne-fine rising nucleation streams (strictly bounded below rising waterline)
    for (let i = 0; i < risingCount; i++) {
      const b = risingSeeds[i];
      b.yNorm += b.speed * agitation * beat2SpeedMul * clampedDt;
      if (b.yNorm >= activeCeilingNorm) {
        const span = Math.max(0.02, activeCeilingNorm - 0.078);
        b.yNorm = 0.078 + ((b.yNorm - activeCeilingNorm) % span) * 0.45;
      }

      const maxR =
        sampleLiquidRadiusAtYNorm(b.yNorm, innerBodyR, innerNeckR) - b.radius * 2.2;
      const r = Math.max(0.008, maxR * b.radialFactor);

      const waveScale = (b.isStream ? 0.055 : 0.12) * (1 + fillFizz * 0.65);
      const theta =
        b.angle + Math.sin(time * b.wobbleFreq + b.yNorm * 13.0 + b.phase) * waveScale;
      const wobbleR =
        r + Math.cos(time * (b.wobbleFreq * 0.85) + b.phase) * b.wobbleAmp;

      const x = Math.cos(theta) * wobbleR;
      const z = Math.sin(theta) * wobbleR;
      const y = baseY + b.yNorm * H;

      const riseFrac = THREE.MathUtils.clamp(
        (b.yNorm - 0.078) / Math.max(activeCeilingNorm - 0.078, 0.01),
        0,
        1
      );
      const buoyancyGrowth = 0.86 + 0.28 * riseFrac;
      // Subtle +15% buoyant radius swell on Beat 2 as bubbles climb toward the meniscus
      const beat2Swell = 1.0 + beat2Focus * (0.11 + 0.10 * riseFrac) + fillFizz * 0.18;
      const bottomFade = THREE.MathUtils.smoothstep(b.yNorm, 0.078, 0.112);
      const topFade =
        1 - THREE.MathUtils.smoothstep(b.yNorm, activeCeilingNorm - 0.024, activeCeilingNorm);
      const fillVis = currentFillLevel > 0.02 ? 1.0 : 0.0;
      const scale = b.radius * buoyancyGrowth * beat2Swell * bottomFade * topFade * fillVis;

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

    // Update organic clinging inner-wall carbonation pearls (direct matrix write, zero trig)
    const wallArr = wallMesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < wallCount; i++) {
      const w = wallSeeds[i];
      const submerged = 1 - THREE.MathUtils.smoothstep(w.yNorm, activeCeilingNorm - 0.025, activeCeilingNorm);
      const pulse = 0.92 + Math.sin(time * w.shimmerFreq + w.phase) * 0.09;
      const s = w.radius * pulse * submerged;
      const offset = i * 16;
      wallArr[offset] = s;
      wallArr[offset + 1] = 0;
      wallArr[offset + 2] = 0;
      wallArr[offset + 3] = 0;
      wallArr[offset + 4] = 0;
      wallArr[offset + 5] = s * w.edgeStretchY;
      wallArr[offset + 6] = 0;
      wallArr[offset + 7] = 0;
      wallArr[offset + 8] = 0;
      wallArr[offset + 9] = 0;
      wallArr[offset + 10] = s;
      wallArr[offset + 11] = 0;
      wallArr[offset + 12] = w.x;
      wallArr[offset + 13] = w.y;
      wallArr[offset + 14] = w.z;
      wallArr[offset + 15] = 1;
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
    dripGeo.dispose();
    dripTrailGeo.dispose();
    dripTrailMat.dispose();
    bubbleGeo.dispose();
    bubbleMaterial.dispose();
  };

  return {
    group,
    setFillLevel,
    update,
    dispose,
  };
}

export const createSparklingWater = createSparklingWaterSystem;
