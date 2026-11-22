import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BottleScene } from '@/scene/BottleScene';
import type { PackMode } from '@/scene/types';
import {
  DEFAULT_SERIF_ID,
  FONT_CANDIDATES,
  applySerifFontToDocument,
  loadSerifFont,
  renderWordmarkCanvas,
  renderWordmarkSideCanvas,
  type WordmarkCase,
} from '@/styles/typography';
import type { PackId } from '@/commerce';
import {
  AboutView,
  KineticParallaxStage,
  Navbar,
  ShopView,
  type SiteView,
} from '@/components/layout';

const SCROLL_STOPS = [0, 1 / 3, 2 / 3, 1] as const;
const LUXURY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

declare global {
  interface Window {
    __setBocaScroll?: (progress: number) => void;
    __setBocaView?: (view: SiteView) => void;
  }
}

export function App() {
  const hostRef = useRef<HTMLElement | null>(null);
  const scrollTargetRef = useRef(0);
  const scrollCurrentRef = useRef(0);
  const scrollSettleTargetRef = useRef<number | null>(0);
  const lastWheelTimeRef = useRef(0);

  const [activeView, setActiveView] = useState<SiteView>('home');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [fontLoadRevision, setFontLoadRevision] = useState(0);
  const [selectedPack, setSelectedPack] = useState<PackId>('1-pack');
  const [packExpanded, setPackExpanded] = useState(false);

  const activeViewRef = useRef<SiteView>(activeView);
  activeViewRef.current = activeView;

  const activeFont =
    FONT_CANDIDATES.find((c) => c.id === DEFAULT_SERIF_ID) ??
    FONT_CANDIDATES[0];

  useEffect(() => {
    let cancelled = false;
    applySerifFontToDocument(DEFAULT_SERIF_ID);
    void loadSerifFont(DEFAULT_SERIF_ID).then(() => {
      if (!cancelled) {
        setFontLoadRevision((v) => v + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Exact coastal-drive virtual wheel / touch / keyboard scroll engine with 4-beat settle (Home view)
  useEffect(() => {
    let rafId = 0;
    let prevNow = performance.now();
    let touchStartY = 0;
    let lastPublished = -1;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const jumpTo = (target: number) => {
      const clamped = clamp01(target);
      scrollTargetRef.current = clamped;
      scrollSettleTargetRef.current = clamped;
      lastWheelTimeRef.current = 0;
    };

    window.__setBocaScroll = (p: number) => {
      const clamped = clamp01(p);
      scrollTargetRef.current = clamped;
      scrollCurrentRef.current = clamped;
      scrollSettleTargetRef.current = clamped;
      lastWheelTimeRef.current = 0;
      if (hostRef.current) {
        hostRef.current.style.setProperty('--scroll-p', clamped.toFixed(5));
      }
      setScrollProgress(clamped);
    };

    window.__setBocaView = (view: SiteView) => {
      setActiveView(view);
      if (view === 'home') {
        jumpTo(0);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (activeViewRef.current !== 'home') return;
      e.preventDefault();
      const step = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      scrollTargetRef.current = clamp01(
        scrollTargetRef.current + step * 0.00065,
      );
      lastWheelTimeRef.current = performance.now();
      scrollSettleTargetRef.current = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (activeViewRef.current !== 'home') return;
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (activeViewRef.current !== 'home') return;
      if (e.touches.length === 0) return;
      const y = e.touches[0].clientY;
      const deltaY = touchStartY - y;
      touchStartY = y;
      scrollTargetRef.current = clamp01(
        scrollTargetRef.current + deltaY * 0.0014,
      );
      lastWheelTimeRef.current = performance.now();
      scrollSettleTargetRef.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (activeViewRef.current !== 'home') return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        const nextIdx = Math.min(
          SCROLL_STOPS.length - 1,
          Math.round(scrollTargetRef.current * (SCROLL_STOPS.length - 1)) + 1,
        );
        jumpTo(SCROLL_STOPS[nextIdx]);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const prevIdx = Math.max(
          0,
          Math.round(scrollTargetRef.current * (SCROLL_STOPS.length - 1)) - 1,
        );
        jumpTo(SCROLL_STOPS[prevIdx]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        jumpTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        jumpTo(1);
      }
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0.001, (now - prevNow) / 1000));
      prevNow = now;

      if (now - lastWheelTimeRef.current > 160) {
        if (scrollSettleTargetRef.current === null) {
          let nearest: number = SCROLL_STOPS[0];
          let minDist = Math.abs(scrollTargetRef.current - nearest);
          for (let i = 1; i < SCROLL_STOPS.length; i++) {
            const d = Math.abs(scrollTargetRef.current - SCROLL_STOPS[i]);
            if (d < minDist) {
              minDist = d;
              nearest = SCROLL_STOPS[i];
            }
          }
          scrollSettleTargetRef.current = nearest;
        }
        const settle = scrollSettleTargetRef.current;
        if (Math.abs(scrollTargetRef.current - settle) > 1e-4) {
          scrollTargetRef.current +=
            (settle - scrollTargetRef.current) * (1 - Math.exp(-5.5 * dt));
        } else {
          scrollTargetRef.current = settle;
        }
      }

      scrollCurrentRef.current +=
        (scrollTargetRef.current - scrollCurrentRef.current) *
        (1 - Math.exp(-4.8 * dt));

      const cur = scrollCurrentRef.current;
      if (hostRef.current) {
        hostRef.current.style.setProperty('--scroll-p', cur.toFixed(5));
      }

      if (Math.abs(cur - lastPublished) > 0.0003) {
        lastPublished = cur;
        setScrollProgress(cur);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      delete window.__setBocaScroll;
      delete window.__setBocaView;
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleJumpToProgress = useCallback((target: number) => {
    const clamped = Math.max(0, Math.min(1, target));
    scrollTargetRef.current = clamped;
    scrollSettleTargetRef.current = clamped;
    lastWheelTimeRef.current = 0;
  }, []);

  const handleSelectView = useCallback(
    (view: SiteView) => {
      setActiveView(view);
      if (view === 'home') {
        handleJumpToProgress(0);
        setPackExpanded(false);
      } else if (view === 'shop') {
        setPackExpanded(false);
      }
    },
    [handleJumpToProgress],
  );

  const handleSelectPack = useCallback((packId: PackId) => {
    setSelectedPack(packId);
    setPackExpanded(packId !== '1-pack');
  }, []);

  const handleToggleExpand = useCallback(() => {
    setPackExpanded((prev) => !prev);
  }, []);

  const handleCanTap = useCallback(() => {
    if (activeView === 'shop' && selectedPack !== '1-pack') {
      setPackExpanded((prev) => !prev);
    }
  }, [activeView, selectedPack]);

  const renderWordmark = useCallback(
    (fontFamily: string, textCase?: WordmarkCase) => {
      void fontLoadRevision;
      return renderWordmarkCanvas(fontFamily, textCase ?? 'upper');
    },
    [fontLoadRevision],
  );

  const renderWordmarkSide = useCallback(
    (side: 'front' | 'back', fontFamily?: string) => {
      void fontLoadRevision;
      return renderWordmarkSideCanvas(side, fontFamily);
    },
    [fontLoadRevision],
  );

  const effectivePackMode: PackMode =
    activeView === 'shop' ? selectedPack : '1-pack';
  const effectivePackExpanded = activeView === 'shop' && packExpanded;

  return (
    <main
      ref={hostRef}
      className="relative h-screen w-screen overflow-hidden bg-[#030304] text-[#f6f5f1]"
    >
      <div className="fixed inset-0 z-0">
        <BottleScene
          fontFamily={activeFont.canvasFontFamily}
          textCase="upper"
          renderWordmarkCanvas={renderWordmark}
          renderWordmarkSideCanvas={renderWordmarkSide}
          lightingPreset="studio-dark"
          viewMode={activeView}
          packMode={effectivePackMode}
          packExpanded={effectivePackExpanded}
          onCanTap={handleCanTap}
          scrollProgress={scrollProgress}
          interactive
        />
      </div>

      <Navbar activeView={activeView} onSelectView={handleSelectView} />

      <AnimatePresence mode="wait">
        {activeView === 'home' && (
          <motion.div
            key="home-stage"
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.95, ease: LUXURY_EASE },
            }}
            exit={{
              opacity: 0,
              y: -24,
              transition: { duration: 0.45, ease: LUXURY_EASE },
            }}
            className="fixed inset-0 z-20 pointer-events-none"
          >
            <KineticParallaxStage
              hostRef={hostRef}
              onJumpToProgress={handleJumpToProgress}
              onSelectView={handleSelectView}
            />
          </motion.div>
        )}

        {activeView === 'shop' && (
          <ShopView
            selectedPack={selectedPack}
            packExpanded={packExpanded}
            onSelectPack={handleSelectPack}
            onToggleExpand={handleToggleExpand}
          />
        )}

        {activeView === 'about' && <AboutView />}
      </AnimatePresence>
    </main>
  );
}

export default App;
