import { memo, useEffect, useRef } from 'react';
import { WaterButton } from '@/components/ui/WaterButton';

export const KP_DEFAULTS = {
  headSpeed: -0.09,
  lineSpread: 12,
  bodySpeed: -0.04,
  btnSpeed: 0.08,
} as const;

export interface KineticParallaxStageProps {
  hostRef: React.RefObject<HTMLElement | null>;
  onJumpToProgress: (progress: number, durationMs?: number) => void;
  onDirectReturnToTop: () => void;
  directReturn?: boolean;
  goldWordmark?: boolean;
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
  onDirectReturnToTop,
  directReturn = false,
  goldWordmark = true,
}: KineticParallaxStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const titleFinishClass = '';

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

    let cachedVh = Math.max(1, stage.clientHeight);
    let lastProgress = -1;
    let lastMx = 999;
    let lastMy = 999;
    let lastVh = -1;

    const ro = new ResizeObserver(() => {
      cachedVh = Math.max(1, stage.clientHeight);
    });
    ro.observe(stage);

    const stepFromScroll = (now: number) => {
      rafId = requestAnimationFrame(stepFromScroll);
      if (document.hidden) return;

      const dt = Math.min(0.05, Math.max(0.001, (now - prevNow) / 1000));
      prevNow = now;

      const host = hostRef.current;
      const rawP = host
        ? parseFloat(host.style.getPropertyValue('--scroll-p') || '0')
        : 0;
      const progress = Number.isFinite(rawP)
        ? Math.min(1, Math.max(0, rawP))
        : 0;

      const vh = cachedVh;
      const totalSpan = BEAT_COUNT - 1; // 0..3

      const mouseAlpha = 1 - Math.exp(-6.0 * dt);
      curMouseX += (targetMouseX - curMouseX) * mouseAlpha;
      curMouseY += (targetMouseY - curMouseY) * mouseAlpha;

      // Skip redundant DOM style writes once scroll & pointer have settled
      if (
        Math.abs(progress - lastProgress) < 0.0001 &&
        Math.abs(curMouseX - lastMx) < 0.0005 &&
        Math.abs(curMouseY - lastMy) < 0.0005 &&
        vh === lastVh
      ) {
        return;
      }
      lastProgress = progress;
      lastMx = curMouseX;
      lastMy = curMouseY;
      lastVh = vh;

      const groupX = reducedMotion ? 0 : curMouseX * -12;
      const groupY = reducedMotion ? 0 : curMouseY * -8;

      const smoothstep = (edge0: number, edge1: number, x: number) => {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
      };

      for (let i = 0; i < sections.length; i++) {
        const deltaBeat = i - progress * totalSpan;
        const absDelta = Math.abs(deltaBeat);
        const visible = absDelta < 0.7;
        sections[i].style.opacity = visible ? '1' : '0';
        sections[i].style.visibility = visible ? 'visible' : 'hidden';
      }

      for (const item of roleEls) {
        const deltaBeat = item.sectionIdx - progress * totalSpan;
        const absDelta = Math.abs(deltaBeat);
        const baseY = deltaBeat * vh;

        // Softer sequential fade-in per beat: Title -> Description -> Puddle Button(s)
        // Smoothstep^1.55 curve softens both entry & exit ramps with calm vertical settle
        let roleAlpha = 1;
        let settleLift = 0;
        if (item.role === 'headline') {
          roleAlpha = Math.pow(smoothstep(0.72, 0.08, absDelta), 1.55);
          settleLift = 14;
        } else if (item.role === 'body') {
          roleAlpha = Math.pow(smoothstep(0.56, 0.06, absDelta), 1.55);
          settleLift = 18;
        } else {
          roleAlpha = Math.pow(smoothstep(0.42, 0.03, absDelta), 1.55);
          settleLift = 20;
        }

        item.el.style.opacity = roleAlpha.toFixed(3);
        if (item.role === 'button') {
          item.el.style.pointerEvents = roleAlpha > 0.25 ? '' : 'none';
        }

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

        // Gentle vertical settle as each element fades into focus (scroll-down & scroll-up)
        const dirSign = deltaBeat >= 0 ? 1 : -1;
        const fadeDriftY = (1 - roleAlpha) * settleLift * dirSign;

        // Layered pointer depth between headline, body, and puddle button
        const depthMul =
          item.role === 'headline' ? 1.15 : item.role === 'body' ? 0.8 : 0.52;

        // Hard even integer pixel snapping for crisp text rendering
        const tx = Math.round((groupX * depthMul) / 2) * 2;
        const ty =
          Math.round((baseY + parallaxY + fadeDriftY + groupY * depthMul) / 2) *
          2;
        item.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      }
    };

    rafId = requestAnimationFrame(stepFromScroll);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [hostRef]);

  return (
    <div
      ref={stageRef}
      style={{
        opacity: directReturn ? 0 : 1,
        transition: directReturn
          ? 'opacity 0.56s cubic-bezier(0.22, 1, 0.36, 1)'
          : 'opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className="kp-scroll-canvas"
    >
      {/* Beat 1 (progress = 0.00): Left-aligned — right-angled can commands right space */}
      <section className="kp-section kp-align-left" data-k-section="0">
        <div className="flex max-w-[min(86vw,540px)] flex-col">
          <span
            className={`kp-headline-line kp-serif-title font-editorial text-[clamp(46px,11.6vw,60px)] sm:text-[clamp(74px,8.6vw,138px)] font-normal leading-[0.93] tracking-[-0.03em] ${titleFinishClass}`}
            data-k-role="headline"
            data-line-idx="0"
          >
            It all
            <br />
            starts with
            <br />
            the water.
          </span>
        </div>
        <p
          className="max-w-[40ch] font-editorial text-[20px] sm:text-[23px] font-normal leading-[1.38] text-[var(--fg-muted)]"
          data-k-role="body"
        >
          Cold-bottled sparkling mineral water in pure transparent form—stripped
          of paper, flavor, and noise so nothing stands between you and a quiet
          mind.
        </p>
        <div data-k-role="button" className="mt-3">
          <WaterButton
            label="Continue"
            gold={goldWordmark}
            size="hero"
            onClick={() => onJumpToProgress(1 / 3, 1350)}
            className="pointer-events-auto"
          />
        </div>
      </section>

      {/* Beat 2 (progress = 0.333): Right-aligned — can fills large top-left */}
      <section className="kp-section kp-align-right" data-k-section="1">
        <div className="flex max-w-[min(86vw,740px)] flex-col items-start sm:items-end">
          <span
            className={`kp-headline-line kp-serif-title font-editorial text-[clamp(46px,11.6vw,60px)] sm:text-[clamp(74px,8.6vw,138px)] font-normal leading-[0.93] tracking-[-0.03em] ${titleFinishClass}`}
            data-k-role="headline"
            data-line-idx="0"
          >
            From the mouth of the earth.
          </span>
        </div>
        <p
          className="max-w-[40ch] font-editorial text-[20px] sm:text-[23px] font-normal leading-[1.38] text-[var(--fg-muted)]"
          data-k-role="body"
        >
          Drawn from deep volcanic basalt where stone filters every drop through
          silky natural silica, then sealed cold inside a crystal-clear 12 fl oz
          vessel.
        </p>
        <div
          data-k-role="button"
          className="mt-3 flex items-center gap-7 sm:gap-9"
        >
          <WaterButton
            label="Back"
            gold={goldWordmark}
            size="hero"
            onClick={() => onJumpToProgress(0, 1350)}
            className="pointer-events-auto"
          />
          <WaterButton
            label="Continue"
            gold={goldWordmark}
            size="hero"
            onClick={() => onJumpToProgress(2 / 3, 1350)}
            className="pointer-events-auto"
          />
        </div>
      </section>

      {/* Beat 3 (progress = 0.667): Closer centered placement BELOW horizontal can + wide 2-line serif description */}
      <section className="kp-section kp-align-bottom-center" data-k-section="2">
        <div className="flex max-w-[min(92vw,920px)] flex-col items-center pt-6 sm:pt-10">
          <span
            className={`kp-headline-line kp-serif-title font-editorial text-[clamp(46px,11.6vw,60px)] sm:text-[clamp(74px,8.6vw,138px)] font-normal leading-[0.93] tracking-[-0.03em] ${titleFinishClass}`}
            data-k-role="headline"
            data-line-idx="0"
          >
            Clarity you taste.
          </span>
        </div>
        <p
          className="max-w-[min(92vw,780px)] font-editorial text-[20px] sm:text-[23px] font-normal leading-[1.38] text-[var(--fg-muted)]"
          data-k-role="body"
        >
          Infused below the threshold of taste with 150 mg Suntheanine®
          L-Theanine and 75 mg/L natural silica—effortless calm focus, with zero
          caffeine and zero bitterness.
        </p>
        <div
          data-k-role="button"
          className="mt-3 flex items-center justify-center gap-7 sm:gap-9"
        >
          <WaterButton
            label="Back"
            gold={goldWordmark}
            size="hero"
            onClick={() => onJumpToProgress(1 / 3, 1350)}
            className="pointer-events-auto"
          />
          <WaterButton
            label="Continue"
            gold={goldWordmark}
            size="hero"
            onClick={() => onJumpToProgress(1, 1350)}
            className="pointer-events-auto"
          />
        </div>
      </section>

      {/* Beat 4 (progress = 1.00): Right-aligned — single direct-return Back button straight to Beat 1 */}
      <section className="kp-section kp-align-right" data-k-section="3">
        <div className="flex max-w-[min(86vw,660px)] flex-col items-start sm:items-end">
          <span
            className={`kp-headline-line kp-serif-title font-editorial text-[clamp(46px,11.6vw,60px)] sm:text-[clamp(74px,8.6vw,138px)] font-normal leading-[0.93] tracking-[-0.03em] ${titleFinishClass}`}
            data-k-role="headline"
            data-line-idx="0"
          >
            Live in the clear.
          </span>
        </div>
        <p
          className="max-w-[40ch] font-editorial text-[20px] sm:text-[23px] font-normal leading-[1.38] text-[var(--fg-muted)]"
          data-k-role="body"
        >
          Made for the morning desk, the long table, and late-night momentum.
          Pure sparkling stillness, chilled and ready whenever the day asks for
          clarity.
        </p>
        <div data-k-role="button" className="mt-3">
          <WaterButton
            label="Back"
            gold={goldWordmark}
            size="hero"
            onClick={onDirectReturnToTop}
            className="pointer-events-auto"
          />
        </div>
      </section>
    </div>
  );
});
