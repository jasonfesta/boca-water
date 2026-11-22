import { memo, useEffect, useRef } from 'react';
import { WaterButton } from '@/components/ui/WaterButton';
import type { SiteView } from './Navbar';

export const KP_DEFAULTS = {
  headSpeed: -0.09,
  lineSpread: 12,
  bodySpeed: -0.04,
  btnSpeed: 0.08,
} as const;

export interface KineticParallaxStageProps {
  hostRef: React.RefObject<HTMLElement | null>;
  onJumpToProgress: (progress: number) => void;
  onSelectView: (view: SiteView) => void;
}

interface RoleElementState {
  el: HTMLElement;
  sectionIdx: number;
  role: 'headline' | 'body' | 'button';
  lineIdx: number;
}

const BEAT_COUNT = 4;

export const KineticParallaxStage = memo(function KineticParallaxStage({
  hostRef,
  onJumpToProgress,
  onSelectView,
}: KineticParallaxStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const sections = Array.from(
      stage.querySelectorAll<HTMLElement>('.kp-section[data-k-section]'),
    );
    const roleEls: RoleElementState[] = [];

    sections.forEach((section, sectionIdx) => {
      const nodes = Array.from(
        section.querySelectorAll<HTMLElement>('[data-k-role]'),
      );
      for (const el of nodes) {
        const roleAttr = el.dataset.kRole;
        const role: RoleElementState['role'] =
          roleAttr === 'body' || roleAttr === 'button' ? roleAttr : 'headline';
        const lineIdx = Number(el.dataset.lineIdx ?? 0);
        roleEls.push({
          el,
          sectionIdx,
          role,
          lineIdx: Number.isFinite(lineIdx) ? lineIdx : 0,
        });
      }
    });

    let targetMouseX = 0;
    let targetMouseY = 0;
    let curMouseX = 0;
    let curMouseY = 0;
    let rafId = 0;
    let prevNow = performance.now();

    const onPointerMove = (e: PointerEvent) => {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      targetMouseX = (e.clientX / w) * 2 - 1;
      targetMouseY = (e.clientY / h) * 2 - 1;
    };

    const onPointerLeave = () => {
      targetMouseX = 0;
      targetMouseY = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });

    const stepFromScroll = (now: number) => {
      rafId = requestAnimationFrame(stepFromScroll);

      const dt = Math.min(0.05, Math.max(0.001, (now - prevNow) / 1000));
      prevNow = now;

      const host = hostRef.current;
      const rawP = host
        ? parseFloat(host.style.getPropertyValue('--scroll-p') || '0')
        : 0;
      const progress = Number.isFinite(rawP)
        ? Math.min(1, Math.max(0, rawP))
        : 0;

      const vh = Math.max(1, stage.clientHeight);
      const totalSpan = BEAT_COUNT - 1; // 0..3

      const mouseAlpha = 1 - Math.exp(-6.0 * dt);
      curMouseX += (targetMouseX - curMouseX) * mouseAlpha;
      curMouseY += (targetMouseY - curMouseY) * mouseAlpha;
      const groupX = reducedMotion ? 0 : curMouseX * -12;
      const groupY = reducedMotion ? 0 : curMouseY * -8;

      for (let i = 0; i < sections.length; i++) {
        const deltaBeat = i - progress * totalSpan;
        const vis = Math.max(0, 1 - Math.abs(deltaBeat) * 1.35);
        sections[i].style.opacity = vis.toFixed(3);
        sections[i].style.visibility = vis > 0.01 ? 'visible' : 'hidden';
      }

      for (const item of roleEls) {
        const deltaBeat = item.sectionIdx - progress * totalSpan;
        const baseY = deltaBeat * vh;

        if (reducedMotion) {
          item.el.style.transform = `translate3d(0px, ${Math.round(baseY)}px, 0)`;
          continue;
        }

        const c = Math.max(-1, Math.min(1, -deltaBeat));
        let parallaxY = 0;
        if (item.role === 'headline') {
          parallaxY =
            -c * vh * KP_DEFAULTS.headSpeed +
            c * item.lineIdx * KP_DEFAULTS.lineSpread;
        } else if (item.role === 'body') {
          parallaxY = -c * vh * KP_DEFAULTS.bodySpeed;
        } else {
          parallaxY = -c * vh * KP_DEFAULTS.btnSpeed;
        }

        // Pixel-snapped integer coordinates for razor-sharp hard-pixel text rendering
        const tx = Math.round(groupX);
        const ty = Math.round(baseY + parallaxY + groupY);
        item.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      }
    };

    rafId = requestAnimationFrame(stepFromScroll);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [hostRef]);

  return (
    <div ref={stageRef} className="kp-scroll-canvas">
      {/* Beat 1 (progress = 0.00): Left-aligned — can commands right space */}
      <section className="kp-section kp-align-left" data-k-section="0">
        <div className="flex max-w-[min(86vw,540px)] flex-col gap-3">
          <span
            className="kp-headline-line kp-glass-title font-ui text-[clamp(56px,7.2vw,108px)] font-semibold leading-[0.94] tracking-[-0.035em]"
            data-k-role="headline"
            data-line-idx="0"
          >
            BOCA water
          </span>
          <span
            className="kp-headline-line font-ui text-[clamp(18px,2.1vw,28px)] font-normal leading-[1.2] tracking-[-0.015em] text-[#f6f5f1]/82"
            data-k-role="headline"
            data-line-idx="1"
          >
            sparkling clarity, nothing in between
          </span>
        </div>
        <p
          className="max-w-[42ch] font-ui text-[15px] leading-[1.62] text-[#f6f5f1]/68"
          data-k-role="body"
        >
          Unflavored sparkling mineral water bottled cold in crystal-clear
          form—made for quiet mornings, deep work, and unhurried days.
        </p>
        <div data-k-role="button" className="mt-1 -ml-[12px]">
          <WaterButton
            label="Continue"
            scale={1.32}
            onClick={() => onJumpToProgress(1 / 3)}
            className="pointer-events-auto"
          />
        </div>
      </section>

      {/* Beat 2 (progress = 0.333): Right-aligned — can fills large top-left */}
      <section className="kp-section kp-align-right" data-k-section="1">
        <div className="flex max-w-[min(86vw,560px)] flex-col items-start sm:items-end gap-3">
          <span
            className="kp-headline-line kp-glass-title font-ui text-[clamp(46px,5.8vw,86px)] font-semibold leading-[0.96] tracking-[-0.035em]"
            data-k-role="headline"
            data-line-idx="0"
          >
            From the mouth of the earth
          </span>
          <span
            className="kp-headline-line font-ui text-[clamp(18px,2.1vw,26px)] font-normal leading-[1.2] tracking-[-0.015em] text-[#f6f5f1]/82"
            data-k-role="headline"
            data-line-idx="1"
          >
            volcanic basalt filtration, zero noise
          </span>
        </div>
        <p
          className="max-w-[42ch] font-ui text-[15px] leading-[1.62] text-[#f6f5f1]/68"
          data-k-role="body"
        >
          Drawn from deep volcanic rock naturally rich in silky silica and
          sealed in a transparent 12 fl oz vessel—no paper wrap, no flavorings,
          no sugar.
        </p>
        <div data-k-role="button" className="mt-1 sm:-mr-[12px]">
          <WaterButton
            label="Continue"
            scale={1.32}
            onClick={() => onJumpToProgress(2 / 3)}
            className="pointer-events-auto"
          />
        </div>
      </section>

      {/* Beat 3 (progress = 0.667): Bottom-left — can floats sideways above/right */}
      <section className="kp-section kp-align-bottom-left" data-k-section="2">
        <div className="flex max-w-[min(86vw,540px)] flex-col gap-3">
          <span
            className="kp-headline-line kp-glass-title font-ui text-[clamp(46px,5.8vw,86px)] font-semibold leading-[0.96] tracking-[-0.035em]"
            data-k-role="headline"
            data-line-idx="0"
          >
            Clarity you never taste
          </span>
          <span
            className="kp-headline-line font-ui text-[clamp(17px,1.9vw,24px)] font-normal leading-[1.22] tracking-[-0.015em] text-[#f6f5f1]/82"
            data-k-role="headline"
            data-line-idx="1"
          >
            150 mg Suntheanine® L-Theanine + 75 mg/L natural silica
          </span>
        </div>
        <p
          className="max-w-[44ch] font-ui text-[15px] leading-[1.62] text-[#f6f5f1]/68"
          data-k-role="body"
        >
          Formulated below the human taste threshold for 100% crystal
          clarity—calm alpha-wave focus without caffeine, bitterness, or crash.
        </p>
        <div data-k-role="button" className="mt-1 -ml-[12px]">
          <WaterButton
            label="Continue"
            scale={1.32}
            onClick={() => onJumpToProgress(1)}
            className="pointer-events-auto"
          />
        </div>
      </section>

      {/* Beat 4 (progress = 1.00): Right-aligned — Shop finale with 2 Drive water-ripple buttons */}
      <section className="kp-section kp-align-right" data-k-section="3">
        <div className="flex max-w-[min(86vw,540px)] flex-col items-start sm:items-end gap-3">
          <span
            className="kp-headline-line kp-glass-title font-ui text-[clamp(50px,6.4vw,94px)] font-semibold leading-[0.94] tracking-[-0.035em]"
            data-k-role="headline"
            data-line-idx="0"
          >
            Live in the clear
          </span>
          <span
            className="kp-headline-line font-ui text-[clamp(18px,2.1vw,26px)] font-normal leading-[1.2] tracking-[-0.015em] text-[#f6f5f1]/82"
            data-k-role="headline"
            data-line-idx="1"
          >
            your daily ritual, chilled and ready
          </span>
        </div>
        <p
          className="max-w-[42ch] font-ui text-[15px] leading-[1.62] text-[#f6f5f1]/68"
          data-k-role="body"
        >
          Keep it on the desk, at the table, or in motion. Choose a single
          bottle, a six-pack, or a twenty-four stack delivered to your door.
        </p>
        <div
          data-k-role="button"
          className="mt-1 flex flex-wrap items-center gap-2 sm:-mr-[12px]"
        >
          <WaterButton
            label="Shop BOCA"
            scale={1.32}
            active
            onClick={() => onSelectView('shop')}
            className="pointer-events-auto"
          />
          <WaterButton
            label="About BOCA"
            scale={1.32}
            onClick={() => onSelectView('about')}
            className="pointer-events-auto"
          />
        </div>
      </section>
    </div>
  );
});
