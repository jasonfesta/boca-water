import { useCallback, useEffect, useId, useRef } from 'react';

export interface WaterButtonProps {
  label: string;
  doneLabel?: string;
  matchLabel?: string;
  active?: boolean;
  filled?: boolean;
  shape?: 'puddle' | 'pill' | 'circle';
  theme?: 'dark' | 'light';
  gold?: boolean;
  size?: 'hero' | 'shop';
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  scale?: number;
}

/**
 * Restrained editorial plain-text action button (black in Light Mode, warm alabaster in Dark Mode,
 * normal case, 30% smaller than the oversized display buttons) with a subtle SVG water-ripple
 * refraction strictly on the letterforms on hover/press.
 */
export function WaterButton({
  label,
  active = false,
  size = 'hero',
  onClick,
  disabled = false,
  title,
  className = '',
}: WaterButtonProps) {
  const reactId = useId();
  const filterId = `boca-text-ripple-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const turbRef = useRef<SVGFETurbulenceElement | null>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const spanRef = useRef<HTMLSpanElement | null>(null);

  const rippleAmpRef = useRef(0);
  const rippleTargetRef = useRef(0);
  const ripplePhaseRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const startLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTimeRef.current) / 1000));
      lastTimeRef.current = now;

      const target = rippleTargetRef.current;
      const amp = rippleAmpRef.current;
      const rate = target > amp ? 8.0 : 2.8;
      const nextAmp = amp + (target - amp) * (1 - Math.exp(-rate * dt));
      rippleAmpRef.current = nextAmp;

      if (rippleTargetRef.current > 0.45) {
        rippleTargetRef.current = Math.max(0.30, rippleTargetRef.current - dt * 1.9);
      }

      ripplePhaseRef.current += dt * (2.2 + nextAmp * 2.0);
      const ph = ripplePhaseRef.current;

      const turb = turbRef.current;
      const disp = dispRef.current;
      const span = spanRef.current;

      if (nextAmp < 0.008 && target < 0.008) {
        rippleAmpRef.current = 0;
        if (disp) disp.setAttribute('scale', '0');
        if (span) span.style.filter = 'none';
        rafRef.current = null;
        return;
      }

      if (turb && disp && span) {
        const fx = (0.016 + Math.sin(ph * 0.9) * 0.006).toFixed(4);
        const fy = (0.052 + Math.cos(ph * 1.35) * 0.018).toFixed(4);
        turb.setAttribute('baseFrequency', `${fx} ${fy}`);
        const scaleVal = (nextAmp * 4.2).toFixed(2);
        disp.setAttribute('scale', scaleVal);
        if (span.style.filter === 'none' || !span.style.filter) {
          span.style.filter = `url(#${filterId})`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [filterId]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const handleEnter = () => {
    if (disabled) return;
    rippleTargetRef.current = 0.40;
    startLoop();
  };

  const handleMove = () => {
    if (disabled) return;
    rippleTargetRef.current = Math.max(rippleTargetRef.current, 0.34);
    startLoop();
  };

  const handleLeave = () => {
    rippleTargetRef.current = 0;
    startLoop();
  };

  const handleClick = () => {
    if (disabled) return;
    rippleTargetRef.current = 0.95;
    startLoop();
    onClick();
  };

  // Exact ~30% reduction from previous 32/42px (hero) and 26/31px (shop), normal case
  const sizeClass =
    size === 'shop'
      ? 'text-[18px] sm:text-[21px] leading-[1.12] tracking-[0.005em]'
      : 'text-[22px] sm:text-[29px] leading-[1.08] tracking-[-0.005em]';

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-label={label}
      onClick={handleClick}
      onPointerEnter={handleEnter}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`boca-text-btn group relative inline-flex items-center justify-center border-none bg-transparent px-0 py-1.5 pt-[calc(0.375rem+2px)] select-none text-[var(--fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--fg)]/40 ${
        disabled ? 'cursor-default opacity-45' : 'cursor-pointer'
      } ${active ? 'is-active' : ''} ${className}`}
    >
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      >
        <defs>
          <filter
            id={filterId}
            x="-8%"
            y="-20%"
            width="116%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.016 0.052"
              numOctaves={2}
              seed={7}
              result="noise"
            />
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <span
        ref={spanRef}
        className={`inline-block font-editorial font-normal text-[var(--fg)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-68 group-active:scale-[0.97] ${sizeClass}`}
      >
        {label}
      </span>
    </button>
  );
}
