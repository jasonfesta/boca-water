import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { renderWordmarkSideCanvas as defaultRenderWordmarkSideCanvas } from '../styles/bottleWordmark';
import { createBackdrop } from './backdrop';
import {
  createBottleAssembly,
  createPackFormationManager,
  type BottleAssembly,
} from './bottleGeometry';
import { createLightingRig } from './lighting';
import { createScrollChoreographyRig } from './scrollRig';
import { createSparklingWaterSystem } from './sparklingWater';
import type {
  BottleLightingRig,
  BottleSceneProps,
  BottleScrollSection,
  PackMode,
  SceneViewMode,
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
  onSectionChange,
  fontFamily = '"Instrument Serif", Georgia, serif',
  textCase = 'upper',
  wordmarkCanvas,
  renderWordmarkCanvas,
  renderWordmarkSideCanvas = defaultRenderWordmarkSideCanvas,
  lightingPreset = 'studio-dark',
  viewMode = 'home',
  packMode = '1-pack',
  packExpanded = false,
  onCanTap,
  interactive = true,
  tuneParams,
  className = '',
}: BottleSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const bottleRef = useRef<BottleAssembly | null>(null);
  const lightingRef = useRef<BottleLightingRig | null>(null);
  const externalScrollRef = useRef<number | undefined>(scrollProgress);
  const onSectionChangeRef = useRef(onSectionChange);
  const onCanTapRef = useRef(onCanTap);
  const interactiveRef = useRef(interactive);
  const viewModeRef = useRef<SceneViewMode>(viewMode);
  const packModeRef = useRef<PackMode>(packMode);
  const packExpandedRef = useRef<boolean>(packExpanded);

  externalScrollRef.current = scrollProgress;
  onSectionChangeRef.current = onSectionChange;
  onCanTapRef.current = onCanTap;
  interactiveRef.current = interactive;
  viewModeRef.current = viewMode;
  packModeRef.current = packMode;
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

    renderer.setPixelRatio(
      isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(initialW, initialH);
    // Exact Orbs dark-mode deep obsidian base (#060607, NOT flat dead #000000)
    renderer.setClearColor(0x060607, 1);
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
    // Orbs chiaroscuro dark-mode balance so clear PET stays deep while highlights pop
    scene.environmentIntensity = 0.68;
    scene.add(lighting.group);
    lightingRef.current = lighting;

    // 2. Orbs dark-mode luminous depth backdrop (@lighting-3d)
    const backdrop = createBackdrop();
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

    // 4. Fluid coastal-drive scroll & pointer spring choreography rig
    const rig = createScrollChoreographyRig();

    // Sync initial vertical BOCA (front) & water (back) wordmarks immediately
    bottle.updateWordmark(
      fontFamily,
      textCase,
      wordmarkCanvas,
      renderWordmarkCanvas,
      renderWordmarkSideCanvas
    );

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
      downX = e.clientX;
      downY = e.clientY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      totalDragDist = 0;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      const finalDist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (totalDragDist < 7 && finalDist < 7) {
        onCanTapRef.current?.();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    let viewportW = initialW;
    let viewportH = initialH;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 1);
        const h = Math.max(Math.floor(entry.contentRect.height), 1);
        viewportW = w;
        viewportH = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    rig.setRawProgress(readProgress());

    let rafId = 0;
    let lastTime = performance.now();
    let lastReportedSection: BottleScrollSection | null = null;
    const startTime = lastTime;

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      const elapsed = (now - startTime) / 1000;
      lastTime = now;

      if (typeof externalScrollRef.current === 'number') {
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
      const inPackView = currentView === 'shop';
      const effectivePackMode: PackMode = inPackView
        ? packModeRef.current
        : '1-pack';
      const effectiveExpanded = inPackView ? packExpandedRef.current : false;

      const scrollState = rig.update(
        elapsed,
        dt,
        stagePivot,
        camera,
        aspect,
        effectivePackMode,
        effectiveExpanded,
        currentView
      );

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

      sparklingWater.update(elapsed, dt, scrollState);
      lighting.update(elapsed, scrollState);
      backdrop.update(elapsed, scrollState, {
        width: viewportW,
        height: viewportH,
      });

      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);

      bottleRef.current = null;
      lightingRef.current = null;

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

    const redraw = () => {
      if (bottleRef.current === bottle) {
        bottle.updateWordmark(
          fontFamily,
          textCase,
          wordmarkCanvas,
          renderWordmarkCanvas,
          renderWordmarkSideCanvas
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
        fontSet.load(`400 280px ${primaryFamily}`, 'BOCAwater'),
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
        className={`relative flex items-center justify-center bg-[#060607] text-slate-300 ${className}`}
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
