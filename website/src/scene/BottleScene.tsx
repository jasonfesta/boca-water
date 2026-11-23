import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  BOTTLE_WORDMARK_CONFIG,
  renderWordmarkSideCanvas as defaultRenderWordmarkSideCanvas,
} from '../styles/bottleWordmark';
import { createBackdrop } from './backdrop';
import {
  createBottleAssembly,
  createPackFormationManager,
  createShopTrioShowcase,
  type BottleAssembly,
  type ShopTrioShowcase,
} from './bottleGeometry';
import { createLightingRig } from './lighting';
import { createScrollChoreographyRig, evaluateScrollPose, type SampledPose } from './scrollRig';
import { createSparklingWaterSystem } from './sparklingWater';
import type {
  BottleLightingRig,
  BottleSceneProps,
  BottleScrollSection,
  PackMode,
  SceneTheme,
  SceneViewMode,
  ScienceHotspotId,
  ScienceHotspotPositions,
  ShopItemId,
} from './types';

function detectSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const rendererStr = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    return /swiftshader|llvmpipe|software/i.test(rendererStr);
  } catch {
    return false;
  }
}

/**
 * Full-bleed interactive 3D stage for the Boca Water 12 fl oz (355mL)
 * crystal-clear PET sparkling water can with Orbs dark-mode studio depth,
 * coastal-drive fluid scroll choreography, pointer spring oscillation, and
 * interactive 1-pack / 6-pack / 24-pack 3D formations.
 */
export function BottleScene({
  scrollProgress,
  scrollProgressRef: externalScrollObjRef,
  onSectionChange,
  fontFamily = '"Instrument Serif", Georgia, serif',
  textCase = 'upper',
  wordmarkCanvas,
  renderWordmarkCanvas,
  renderWordmarkSideCanvas = defaultRenderWordmarkSideCanvas,
  lightingPreset = 'studio-dark',
  theme = 'light',
  goldWordmark = false,
  viewMode = 'home',
  storyScrollProgress = 0,
  storyScrollProgressRef: externalStoryScrollObjRef,
  shopScrollProgress = 0,
  shopScrollProgressRef: externalShopScrollObjRef,
  directReturn = false,
  packMode = '1-pack',
  hoveredPack = null,
  packExpanded = false,
  onCanTap,
  onIntroComplete,
  activeHotspot = null,
  hotspotPositionsRef,
  onHotspotPositions,
  interactive = true,
  tuneParams,
  className = '',
}: BottleSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const bottleRef = useRef<BottleAssembly | null>(null);
  const shopTrioRef = useRef<ShopTrioShowcase | null>(null);
  const lightingRef = useRef<BottleLightingRig | null>(null);
  const externalScrollRef = useRef<number | undefined>(scrollProgress);
  const externalScrollObjHolder = useRef<{ readonly current: number } | undefined>(
    externalScrollObjRef
  );
  const storyScrollRef = useRef<number>(storyScrollProgress);
  const externalStoryScrollObjHolder = useRef<{ readonly current: number } | undefined>(
    externalStoryScrollObjRef
  );
  const shopScrollRef = useRef<number>(shopScrollProgress);
  const externalShopScrollObjHolder = useRef<{ readonly current: number } | undefined>(
    externalShopScrollObjRef
  );
  const directReturnRef = useRef<boolean>(directReturn);
  const onSectionChangeRef = useRef(onSectionChange);
  const onCanTapRef = useRef(onCanTap);
  const onIntroCompleteRef = useRef(onIntroComplete);
  const activeHotspotRef = useRef<ScienceHotspotId | null>(activeHotspot);
  const hotspotPositionsOutRef = useRef<
    { current: ScienceHotspotPositions } | undefined
  >(hotspotPositionsRef);
  const onHotspotPositionsRef = useRef(onHotspotPositions);
  const interactiveRef = useRef(interactive);
  const themeRef = useRef<SceneTheme>(theme);
  const viewModeRef = useRef<SceneViewMode>(viewMode);
  const packModeRef = useRef<PackMode>(packMode);
  const hoveredPackRef = useRef<ShopItemId | null>(hoveredPack);
  const packExpandedRef = useRef<boolean>(packExpanded);

  externalScrollRef.current = scrollProgress;
  externalScrollObjHolder.current = externalScrollObjRef;
  storyScrollRef.current = storyScrollProgress;
  externalStoryScrollObjHolder.current = externalStoryScrollObjRef;
  shopScrollRef.current = shopScrollProgress;
  externalShopScrollObjHolder.current = externalShopScrollObjRef;
  directReturnRef.current = directReturn;
  onSectionChangeRef.current = onSectionChange;
  onCanTapRef.current = onCanTap;
  onIntroCompleteRef.current = onIntroComplete;
  activeHotspotRef.current = activeHotspot;
  hotspotPositionsOutRef.current = hotspotPositionsRef;
  onHotspotPositionsRef.current = onHotspotPositions;
  interactiveRef.current = interactive;
  themeRef.current = theme;
  viewModeRef.current = viewMode;
  packModeRef.current = packMode;
  hoveredPackRef.current = hoveredPack;
  packExpandedRef.current = packExpanded;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const isSoftware = detectSoftwareRenderer(renderer.getContext());
    const initialW = Math.max(container.clientWidth, 1);
    const initialH = Math.max(container.clientHeight, 1);

    const getOptimalPixelRatio = (w: number) =>
      isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2);

    const initialDpr = getOptimalPixelRatio(initialW);
    renderer.setPixelRatio(initialDpr);
    renderer.setSize(initialW, initialH);
    renderer.transmissionResolutionScale = isSoftware ? 0.5 : initialW < 768 ? 0.75 : 1.0;
    renderer.setClearColor(themeRef.current === 'light' ? 0xf5f4f0 : 0x060607, 1);
    // Exact coastal-drive neutral tone mapping (pure crisp highlights, zero hue shift)
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.32;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      34,
      initialW / initialH,
      0.1,
      60
    );
    camera.position.set(0, 0.12, 4.15);

    // 1. Orbs/coastal-drive HDR studio lighting & PMREM scrims (@lighting-3d)
    const lighting = createLightingRig(renderer, { preset: lightingPreset });
    scene.environment = lighting.envMap;
    scene.environmentIntensity = themeRef.current === 'light' ? 0.95 : 0.68;
    scene.add(lighting.group);
    lightingRef.current = lighting;

    // 2. Backdrop with live ping-pong FBO shallow-water ripples -> Beat 4 moonlit ocean (@lighting-3d)
    const backdrop = createBackdrop({ renderer, theme: themeRef.current });
    scene.add(backdrop.mesh);

    // 3. Unified stage pivot holding hero crystal-clear PET can + pack formation
    const stagePivot = new THREE.Group();
    stagePivot.name = 'BocaStagePivot';
    scene.add(stagePivot);

    const bottle = createBottleAssembly(tuneParams);
    const sparklingWater = createSparklingWaterSystem(tuneParams);
    bottle.group.add(sparklingWater.group);
    stagePivot.add(bottle.group);
    bottleRef.current = bottle;

    const packManager = createPackFormationManager(bottle);
    stagePivot.add(packManager.group);

    // 3b. Interactive 6-item real 3D Shop Showcase (Row 1: 1 / 6 / 24 water; Row 2: Shirt / Hat / Hoodie)
    const shopTrio = createShopTrioShowcase(bottle);
    shopTrio.updateMerchMaterials(themeRef.current === 'dark', goldWordmark);
    shopTrioRef.current = shopTrio;
    scene.add(shopTrio.group);

    // 4. Fluid coastal-drive scroll & pointer spring choreography rig
    const rig = createScrollChoreographyRig();

    // Sync initial vertical BOCA (front) & WATER (back) wordmarks immediately
    const initialInkColor =
      themeRef.current === 'light'
        ? BOTTLE_WORDMARK_CONFIG.colors.light
        : BOTTLE_WORDMARK_CONFIG.colors.dark;
    bottle.updateWordmark(
      fontFamily,
      textCase,
      wordmarkCanvas,
      renderWordmarkCanvas,
      renderWordmarkSideCanvas,
      initialInkColor
    );

    let darkMix = themeRef.current === 'light' ? 0 : 1;
    const clearColorDark = new THREE.Color('#060607');
    const clearColorLight = new THREE.Color('#f5f4f0');
    const clearColorCurrent = clearColorDark.clone();
    bottle.setDarkMix(darkMix);

    // Authoritative scroll progress reader:
    // - Uses external prop if provided
    // - Uses native window scroll if page has scrollable height
    // - Falls back to coastal-drive direct wheel progress (0.00065/px + 160ms snap settle)
    //   when page is a fixed full-viewport KineticParallaxStage!
    let wheelProgress = 0;
    let lastWheelTime = 0;
    const STOP_COUNT = 4;

    const isNativeScrollable = () => {
      const doc = document.documentElement;
      return doc.scrollHeight - window.innerHeight > 80;
    };

    const studyParam =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('study')
        : null;

    const readProgress = (): number => {
      if (externalScrollObjHolder.current) {
        return externalScrollObjHolder.current.current;
      }
      if (typeof externalScrollRef.current === 'number') {
        return externalScrollRef.current;
      }
      if (isNativeScrollable()) {
        const doc = document.documentElement;
        const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
        return THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
      }
      return wheelProgress;
    };

    const handleScroll = () => {
      rig.setRawProgress(readProgress());
    };

    const handleWheel = (e: WheelEvent) => {
      if (typeof externalScrollRef.current === 'number' || isNativeScrollable()) {
        return;
      }
      e.preventDefault();
      const step = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      wheelProgress = THREE.MathUtils.clamp(wheelProgress + step * 0.00065, 0, 1);
      lastWheelTime = performance.now();
      rig.setRawProgress(wheelProgress);
    };

    // Interactive pointer spring oscillation + drag-to-spin + tap-to-puff detection
    let isDragging = false;
    let downX = 0;
    let downY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let totalDragDist = 0;

    const handlePointerMove = (e: PointerEvent) => {
      if (!interactiveRef.current) return;
      const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const ny = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      rig.setPointer(nx, ny);

      if (isDragging) {
        const dxPx = e.clientX - lastPointerX;
        const dyPx = e.clientY - lastPointerY;
        totalDragDist += Math.hypot(dxPx, dyPx);
        rig.addDragDelta(dxPx * 0.0085, dyPx * 0.0045);
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!interactiveRef.current) return;
      isDragging = true;
      rig.setDragging(true);
      downX = e.clientX;
      downY = e.clientY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      totalDragDist = 0;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      rig.setDragging(false);
      const finalDist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (totalDragDist < 7 && finalDist < 7) {
        onCanTapRef.current?.();
      }
    };

    const handlePointerCancel = () => {
      if (!isDragging) return;
      isDragging = false;
      rig.setDragging(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', handlePointerCancel);

    let viewportW = initialW;
    let viewportH = initialH;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 1);
        const h = Math.max(Math.floor(entry.contentRect.height), 1);
        viewportW = w;
        viewportH = h;
        const dpr = getOptimalPixelRatio(w);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(dpr);
        renderer.transmissionResolutionScale = isSoftware ? 0.5 : w < 768 ? 0.75 : 1.0;
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    rig.setRawProgress(readProgress());

    // Signature Opening Loader:
    // Phase 1 (0.0s -> 2.65s): 116px-tall upright centered bottle fills up with sparkling water
    //   while executing TWO full readable 360-deg turns (4*PI: BOCA -> WATER -> BOCA -> WATER -> BOCA).
    // Phase 2 (2.65s -> 3.70s): Smoothly zooms up from 116px into Beat 1's massive Hero resting pose,
    //   firing `onIntroComplete` at t = 3.20s so the Hero UI softly blooms in only as the bottle lands.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const waterFillApi = sparklingWater as { setFillLevel?: (level: number) => void };
    const bottleTotalHeight = bottle.sharedResources.bottleHeight;
    const INTRO_PHASE1_DUR = 2.65;
    const INTRO_UI_TRIGGER = 3.20;
    const INTRO_TOTAL_DUR = 3.70;
    let introDone = Boolean(prefersReducedMotion || studyParam);
    let introUiSignaled = introDone;
    let introElapsed = introDone ? INTRO_TOTAL_DUR : 0;

    if (introDone) {
      waterFillApi.setFillLevel?.(1);
      onIntroCompleteRef.current?.();
    } else {
      waterFillApi.setFillLevel?.(0.02);
    }

    const skipIntro = () => {
      introDone = true;
      introElapsed = INTRO_TOTAL_DUR;
      waterFillApi.setFillLevel?.(1);
      if (!introUiSignaled) {
        introUiSignaled = true;
        onIntroCompleteRef.current?.();
      }
    };
    const winWithSkip = window as unknown as { __skipBocaIntro?: () => void };
    winWithSkip.__skipBocaIntro = skipIntro;

    // Pre-allocated scratch objects for zero per-frame allocations during intro glide
    const introPose: SampledPose = {
      bottlePos: new THREE.Vector3(),
      bottleRot: new THREE.Euler(0, 0, 0, 'ZXY'),
      bottleScale: 1,
      cameraPos: new THREE.Vector3(),
      cameraTarget: new THREE.Vector3(),
      cameraFov: 34,
      section: 'hero',
      sectionProgress: 0,
    };
    const introStartPos = new THREE.Vector3(0, 0, 0);
    const introEndPos = new THREE.Vector3();
    const introStartQuat = new THREE.Quaternion();
    const introEndQuat = new THREE.Quaternion();
    const introTempEuler = new THREE.Euler(0, 0, 0, 'ZXY');
    const introStartCamPos = new THREE.Vector3();
    const introEndCamPos = new THREE.Vector3();
    const introStartTarget = new THREE.Vector3(0, 0, 0);
    const introCurTarget = new THREE.Vector3();

    const smooth01 = (t: number) => {
      const c = THREE.MathUtils.clamp(t, 0, 1);
      return c * c * c * (c * (c * 6 - 15) + 10);
    };

    let rafId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let lastReportedSection: BottleScrollSection | null = null;
    const startTime = lastTime;
    const viewportSize = { width: initialW, height: initialH };

    // Pre-allocated bottle-local anchor points & scratch vector for Science Stop 2 3D hotspots (0 allocs/frame)
    const hotspotAnchors: ReadonlyArray<{
      id: ScienceHotspotId;
      local: THREE.Vector3;
    }> = [
      { id: 'lid', local: new THREE.Vector3(0.22, 1.06, 0.20) },
      { id: 'formula', local: new THREE.Vector3(-0.26, 0.62, 0.24) },
      { id: 'vessel', local: new THREE.Vector3(0.34, 0.04, 0.26) },
      { id: 'punt', local: new THREE.Vector3(-0.22, -0.94, 0.24) },
    ];
    const fallbackHotspotPositions: ScienceHotspotPositions = {
      lid: { x: 0, y: 0, visible: false },
      formula: { x: 0, y: 0, visible: false },
      vessel: { x: 0, y: 0, visible: false },
      punt: { x: 0, y: 0, visible: false },
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else if (!disposed && !rafId) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = (now: number) => {
      if (disposed || document.hidden) {
        rafId = 0;
        return;
      }
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      const elapsed = (now - startTime) / 1000;
      lastTime = now;

      if (externalScrollObjHolder.current) {
        rig.setRawProgress(externalScrollObjHolder.current.current);
      } else if (typeof externalScrollRef.current === 'number') {
        rig.setRawProgress(externalScrollRef.current);
      } else if (!isNativeScrollable() && now - lastWheelTime > 160) {
        // coastal-drive 160ms idle snap-to-stop settle
        const nearest = Math.round(wheelProgress * (STOP_COUNT - 1)) / (STOP_COUNT - 1);
        wheelProgress = THREE.MathUtils.lerp(
          wheelProgress,
          nearest,
          1 - Math.exp(-5.5 * dt)
        );
        rig.setRawProgress(wheelProgress);
      }

      const aspect = viewportW / Math.max(viewportH, 1);

      const currentView = viewModeRef.current;
      const effectivePackMode: PackMode = '1-pack';
      const effectiveExpanded = false;
      const currentStoryProgress = externalStoryScrollObjHolder.current
        ? externalStoryScrollObjHolder.current.current
        : storyScrollRef.current;
      const currentShopProgress = externalShopScrollObjHolder.current
        ? externalShopScrollObjHolder.current.current
        : shopScrollRef.current;

      const scrollState = rig.update(
        elapsed,
        dt,
        stagePivot,
        camera,
        aspect,
        effectivePackMode,
        effectiveExpanded,
        currentView,
        currentStoryProgress,
        directReturnRef.current,
        activeHotspotRef.current,
        viewportW < 768
      );

      // Smoothly drive Signature Opening Loader (exact 116px jewel scale -> dramatic Hero zoom)
      if (!introDone) {
        const userInteracted =
          currentView !== 'home' || scrollState.rawProgress > 0.015;
        introElapsed += dt * (userInteracted ? 4.0 : 1.0);

        const loaderCamZ = 4.45 + (aspect < 0.75 ? 0.65 : 0);
        const visibleH = 2 * loaderCamZ * Math.tan(THREE.MathUtils.degToRad(34 * 0.5));
        const loaderScale =
          (116 / Math.max(viewportH, 320)) * (visibleH / bottleTotalHeight);

        if (introElapsed < INTRO_PHASE1_DUR) {
          const p1 = THREE.MathUtils.clamp(introElapsed / INTRO_PHASE1_DUR, 0, 1);
          const easeOutCubic = 1 - Math.pow(1 - p1, 3);
          const easeInOutSine = -(Math.cos(Math.PI * p1) - 1) * 0.5;
          waterFillApi.setFillLevel?.(0.02 + 0.98 * easeOutCubic);

          const spinY = -0.18 + easeInOutSine * Math.PI * 4;
          stagePivot.rotation.order = 'ZXY';
          stagePivot.position.set(0, 0, 0);
          stagePivot.rotation.set(0, spinY, 0, 'ZXY');
          stagePivot.scale.setScalar(loaderScale);

          camera.position.set(0, 0, loaderCamZ);
          camera.lookAt(0, 0, 0);
          if (Math.abs(camera.fov - 34) > 0.02) {
            camera.fov = 34;
            camera.updateProjectionMatrix();
          }
          rig.syncFromStage(stagePivot, introStartTarget);
        } else {
          waterFillApi.setFillLevel?.(1);
          if (!introUiSignaled && introElapsed >= INTRO_UI_TRIGGER) {
            introUiSignaled = true;
            onIntroCompleteRef.current?.();
          }

          if (introElapsed >= INTRO_TOTAL_DUR || currentView !== 'home') {
            introDone = true;
            if (!introUiSignaled) {
              introUiSignaled = true;
              onIntroCompleteRef.current?.();
            }
          } else {
            const p2 = smooth01(
              (introElapsed - INTRO_PHASE1_DUR) / (INTRO_TOTAL_DUR - INTRO_PHASE1_DUR)
            );
            evaluateScrollPose(0, introPose, aspect);

            const floatY = Math.sin(elapsed * 0.9) * 0.016;
            const idleYaw = Math.sin(elapsed * 0.38) * 0.032;
            const idleRoll = Math.cos(elapsed * 0.52) * 0.008;

            introEndPos.set(
              introPose.bottlePos.x,
              introPose.bottlePos.y + floatY,
              introPose.bottlePos.z
            );
            introTempEuler.set(0, -0.18, 0, 'ZXY');
            introStartQuat.setFromEuler(introTempEuler);
            introTempEuler.set(
              introPose.bottleRot.x + scrollState.pointerY * 0.085,
              introPose.bottleRot.y + idleYaw + scrollState.pointerX * 0.20,
              introPose.bottleRot.z + idleRoll - scrollState.pointerX * 0.04,
              'ZXY'
            );
            introEndQuat.setFromEuler(introTempEuler);

            stagePivot.rotation.order = 'ZXY';
            stagePivot.position.lerpVectors(introStartPos, introEndPos, p2);
            stagePivot.quaternion.slerpQuaternions(introStartQuat, introEndQuat, p2);
            stagePivot.rotation.setFromQuaternion(stagePivot.quaternion, 'ZXY');
            stagePivot.scale.setScalar(
              THREE.MathUtils.lerp(loaderScale, introPose.bottleScale, p2)
            );

            // Dramatic Phase 2 3D orbital camera sweep (~165 deg total azimuthal arc + 0.42 elevation swell)
            // around the zooming bottle, landing seamlessly on Beat 1's exact resting camera
            const arcEnv = Math.sin(Math.PI * p2);
            introStartCamPos.set(0, 0, loaderCamZ);
            introEndCamPos.set(
              introPose.cameraPos.x + scrollState.pointerX * 0.08,
              introPose.cameraPos.y - scrollState.pointerY * 0.045,
              introPose.cameraPos.z
            );
            introCurTarget.lerpVectors(introStartTarget, introPose.cameraTarget, p2);

            const endDx = introEndCamPos.x - introPose.cameraTarget.x;
            const endDz = introEndCamPos.z - introPose.cameraTarget.z;
            const endR = Math.max(0.5, Math.hypot(endDx, endDz));
            const endTheta = Math.atan2(endDx, endDz);
            const endY = introEndCamPos.y - introPose.cameraTarget.y;

            const curR = THREE.MathUtils.lerp(loaderCamZ, endR, p2) + 0.45 * arcEnv;
            const curTheta =
              THREE.MathUtils.lerp(0, endTheta, p2) +
              arcEnv * ((82.5 * Math.PI) / 180);
            const curY = THREE.MathUtils.lerp(0, endY, p2) + 0.42 * arcEnv;

            camera.position.set(
              introCurTarget.x + Math.sin(curTheta) * curR,
              introCurTarget.y + curY,
              introCurTarget.z + Math.cos(curTheta) * curR
            );
            camera.lookAt(introCurTarget);
            rig.syncFromStage(stagePivot, introCurTarget);
          }
        }
      }

      // Smoothly interpolate darkMix (1 = dark, 0 = light) like history-of-orbs-3d
      const currentTheme = themeRef.current;
      const targetDarkMix = currentTheme === 'light' ? 0 : 1;
      darkMix = THREE.MathUtils.lerp(
        darkMix,
        targetDarkMix,
        1 - Math.exp(-dt * 5.5)
      );
      scrollState.theme = currentTheme;
      scrollState.darkMix = darkMix;

      scene.environmentIntensity = THREE.MathUtils.lerp(0.95, 0.68, darkMix);
      clearColorCurrent.lerpColors(clearColorLight, clearColorDark, darkMix);
      renderer.setClearColor(clearColorCurrent, 1);
      bottle.setDarkMix(darkMix);
      bottle.setSparkleTime(elapsed);
      shopTrio.setSparkleTime(elapsed);

      // Publish --scroll-p CSS custom property per frame (coastal-drive zero-React-rerender contract)
      document.documentElement.style.setProperty(
        '--scroll-p',
        scrollState.progress.toFixed(5)
      );

      if (scrollState.section !== lastReportedSection) {
        lastReportedSection = scrollState.section;
        onSectionChangeRef.current?.(scrollState.section, scrollState.progress);
      }

      packManager.update(
        elapsed,
        dt,
        effectivePackMode,
        effectiveExpanded,
        scrollState
      );
      bottle.group.position.copy(packManager.heroOffset);
      bottle.group.rotation.set(
        packManager.heroRotOffset.x,
        packManager.heroRotOffset.y,
        packManager.heroRotOffset.z
      );

      if (studyParam === 'top') {
        stagePivot.position.set(0, -0.82, 0);
        stagePivot.rotation.set(0.32, -0.35, 0, 'ZXY');
        stagePivot.scale.setScalar(1.0);
        camera.position.set(0, 0.42, 1.85);
        camera.lookAt(0, 0.14, 0);
      } else if (studyParam === 'bottom') {
        stagePivot.position.set(0, 0.78, 0);
        stagePivot.rotation.set(-0.26, -0.25, 0, 'ZXY');
        stagePivot.scale.setScalar(1.0);
        camera.position.set(0, -0.26, 1.85);
        camera.lookAt(0, -0.06, 0);
      }

      // Continuously cull single hero can only once smoothly off-screen below (zero abrupt pop-in/out)
      stagePivot.visible = stagePivot.position.y > -5.5;

      // Update real 3D Shop 6-item grid: 1:1 DOM-slot unprojection locked to live viewport & camera
      shopTrio.update(
        elapsed,
        dt,
        currentView === 'shop',
        scrollState,
        hoveredPackRef.current,
        viewportW < 768,
        currentShopProgress,
        camera,
        viewportW,
        viewportH
      );

      if (stagePivot.visible) {
        sparklingWater.update(elapsed, dt, scrollState);
      }
      lighting.update(elapsed, scrollState, currentTheme);
      viewportSize.width = viewportW;
      viewportSize.height = viewportH;
      backdrop.update(elapsed, scrollState, viewportSize, currentTheme);

      // Design screen uses pure monumental 3D bottle with zero "+" hotspot overlays
      const outHotspots = hotspotPositionsOutRef.current?.current ??
        (onHotspotPositionsRef.current ? fallbackHotspotPositions : null);
      if (outHotspots) {
        for (let i = 0; i < hotspotAnchors.length; i++) {
          outHotspots[hotspotAnchors[i].id].visible = false;
        }
        onHotspotPositionsRef.current?.(outHotspots);
      }

      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (winWithSkip.__skipBocaIntro === skipIntro) {
        delete winWithSkip.__skipBocaIntro;
      }
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', handlePointerCancel);

      bottleRef.current = null;
      shopTrioRef.current = null;
      lightingRef.current = null;

      shopTrio.dispose();
      packManager.dispose();
      sparklingWater.dispose();
      bottle.dispose();
      lighting.dispose();
      backdrop.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // Intentionally run once on mount; live prop updates are handled in dedicated effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-update vertical serif wordmark whenever font, casing, or canvas changes (and when webfonts finish loading)
  useEffect(() => {
    const bottle = bottleRef.current;
    if (!bottle) return;

    const inkColor = goldWordmark
      ? 'rgba(255, 255, 255, 0.99)'
      : theme === 'light'
        ? BOTTLE_WORDMARK_CONFIG.colors.light
        : BOTTLE_WORDMARK_CONFIG.colors.dark;

    bottle.setGoldWordmark(goldWordmark, theme === 'dark');
    shopTrioRef.current?.updateMerchMaterials(theme === 'dark', goldWordmark);

    const redraw = () => {
      if (bottleRef.current === bottle) {
        bottle.updateWordmark(
          fontFamily,
          textCase,
          wordmarkCanvas,
          renderWordmarkCanvas,
          renderWordmarkSideCanvas,
          inkColor
        );
      }
    };

    redraw();

    let cancelled = false;
    const primaryFamily = fontFamily.split(',')[0]?.trim() || '"Instrument Serif"';
    const fontSet = typeof document !== 'undefined' ? document.fonts : undefined;

    const handleLoadingDone = () => {
      if (!cancelled) redraw();
    };

    if (fontSet) {
      Promise.allSettled([
        fontSet.load(`400 280px ${primaryFamily}`, 'BOCAWATER'),
        fontSet.ready,
      ]).then(() => {
        if (!cancelled) redraw();
      });
      fontSet.addEventListener?.('loadingdone', handleLoadingDone);
    }

    const timer = window.setTimeout(() => {
      if (!cancelled) redraw();
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      fontSet?.removeEventListener?.('loadingdone', handleLoadingDone);
    };
  }, [
    fontFamily,
    textCase,
    theme,
    goldWordmark,
    wordmarkCanvas,
    renderWordmarkCanvas,
    renderWordmarkSideCanvas,
  ]);

  useEffect(() => {
    lightingRef.current?.setPreset?.(lightingPreset);
  }, [lightingPreset]);

  useEffect(() => {
    if (tuneParams && bottleRef.current) {
      bottleRef.current.applyTuneParams(tuneParams);
    }
  }, [tuneParams]);

  if (webglFailed) {
    return (
      <div
        className={`relative flex items-center justify-center ${
          theme === 'light' ? 'bg-[#f5f4f0] text-[#111113]' : 'bg-[#060607] text-slate-300'
        } ${className}`}
        aria-label="Boca Sparkling Water 12 fl oz crystal-clear PET can"
      >
        <div className="text-center px-6">
          <p className="text-sm tracking-wide text-slate-400">
            Interactive 3D view requires WebGL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none ${
        interactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${className}`}
      aria-label="Interactive 3D Boca Sparkling Water 12 fl oz crystal-clear PET can"
    />
  );
}

export default BottleScene;
