/**
 * Boca Water — Standalone Editable Bottle Wordmark Part
 *
 * Dedicated module for the full-height vertical serif wordmark ("BOCA")
 * printed along both opposite sides (0 deg & 180 deg) of the 12 FL OZ (355mL)
 * crystal-clear PET can. Edit `BOTTLE_WORDMARK_CONFIG` below to tune copy,
 * tight editorial kerning, per-pair optical kerning, vertical height coverage,
 * sizing, vertical offset, or matte-satin ink finish without touching the 3D can geometry.
 */

import {
  DEFAULT_SERIF_ID,
  getSerifCandidate,
  loadSerifFont,
  resolveSerifCandidate,
  type SerifFontId,
} from './typography';

export type WordmarkCase = 'title' | 'upper' | 'lower';
export type WordmarkSide = 'front' | 'back';

export interface WordmarkCaseOption {
  id: WordmarkCase;
  label: string;
  sample: string;
  /** Optical size multiplier when autoFitHeight is disabled */
  scaleMultiplier: number;
}

export const DEFAULT_WORDMARK_CASE: WordmarkCase = 'upper';

export const WORDMARK_CASES: readonly WordmarkCaseOption[] = [
  { id: 'upper', label: 'Upper', sample: 'BOCA', scaleMultiplier: 1.0 },
  { id: 'title', label: 'Title', sample: 'Boca', scaleMultiplier: 1.0 },
  { id: 'lower', label: 'Lower', sample: 'boca', scaleMultiplier: 1.04 },
] as const;

/**
 * Top-level editable configuration for the full-height vertical bottle wordmark.
 * Adjust kerning, height coverage, sizing, ink, or vertical position here.
 */
export const BOTTLE_WORDMARK_CONFIG = {
  /** Base wordmark copy (default: uppercase "BOCA") */
  text: 'BOCA',
  /** Two-sided full-height vertical copy: front (0 deg) = "BOCA", back (180 deg) = "WATER" */
  sides: {
    front: { text: 'BOCA', textCase: 'upper' as WordmarkCase },
    back: { text: 'WATER', textCase: 'upper' as WordmarkCase },
  },
  /** Reading direction along the can spine: 'up' reads bottom-to-top (-90deg) */
  direction: 'up' as 'up' | 'down',
  /** High-DPI canvas dimensions for crisp anti-aliased cylinder UVs (aspect 0.5) */
  canvasWidth: 1024,
  canvasHeight: 2048,
  /** Auto-scale font size so the tight-kerned wordmark spans targetHeightCoverage of the can height */
  autoFitHeight: true,
  /** Target vertical span as a fraction of canvasHeight (~88–92% full-height top-to-bottom) */
  targetHeightCoverage: 0.9,
  /** Safety cap on glyph cap-height as a fraction of canvasWidth so serifs never clip left/right */
  maxWidthCoverage: 0.84,
  /** Explicit pixel font size used when autoFitHeight is false */
  fontSizePx: 720,
  /** Tight luxury editorial tracking in em, calibrated per casing */
  letterSpacingEm: {
    upper: -0.025,
    title: -0.045,
    lower: -0.04,
  } as Record<WordmarkCase, number>,
  /** Explicit per-pair optical kerning adjustments in em (added on top of letterSpacingEm) */
  pairKerningEm: {
    BO: -0.018,
    OC: -0.014,
    CA: -0.022,
    WA: -0.052,
    AT: -0.044,
    TE: -0.016,
    ER: -0.014,
    Bo: -0.018,
    oc: -0.01,
    ca: -0.008,
    bo: -0.014,
    wa: -0.024,
    at: -0.012,
    te: -0.016,
    er: -0.014,
  } as Record<string, number>,
  /** Vertical offset along the can spine in canvas px (+ moves up toward rim, - moves down toward base) */
  verticalOffsetY: 0,
  /** Crisp matte-satin die-cut white ink for clear PET (dark mode default) */
  color: 'rgba(250, 251, 252, 0.98)',
  /** Theme-calibrated matte-satin sticker inks (Dark = crisp white, Light = deep Orka charcoal) */
  colors: {
    dark: 'rgba(250, 251, 252, 0.98)',
    light: 'rgba(17, 17, 19, 0.94)',
  },
  /** Global alpha multiplier (0..1) */
  opacity: 1,
  /** Optional micro-frost halo (disabled by default for razor-sharp matte-satin die-cut edges) */
  subtleEtchGlow: false,
  etchGlowColor: 'rgba(255, 255, 255, 0.18)',
  etchGlowBlurRatio: 0.018,
};

export function formatWordmarkText(
  textCase: WordmarkCase = DEFAULT_WORDMARK_CASE,
  baseText = BOTTLE_WORDMARK_CONFIG.text
): string {
  if (textCase === 'upper') return baseText.toUpperCase();
  if (textCase === 'lower') return baseText.toLowerCase();
  return baseText.charAt(0).toUpperCase() + baseText.slice(1).toLowerCase();
}

export interface BottleWordmarkOptions {
  /** Wordmark string override (default derived from textCase + BOTTLE_WORDMARK_CONFIG.text) */
  text?: string;
  /** Casing variant for case selection on the 355mL sleek PET can (default: "upper" -> "BOCA") */
  textCase?: WordmarkCase;
  /** Selectable serif candidate ID (default: "instrument-serif") */
  fontId?: SerifFontId;
  /** Canvas width in pixels (default: BOTTLE_WORDMARK_CONFIG.canvasWidth) */
  width?: number;
  /** Canvas height in pixels (default: BOTTLE_WORDMARK_CONFIG.canvasHeight) */
  height?: number;
  /** Reading direction along the can spine: "up" reads bottom-to-top (-90deg) */
  direction?: 'up' | 'down';
  /** Ink color (default: BOTTLE_WORDMARK_CONFIG.color) */
  color?: string;
  /** Adds a subtle micro-frost halo around the letterforms */
  subtleEtchGlow?: boolean;
  /** Global alpha multiplier (0..1) */
  opacity?: number;
  /** Override auto-fitting to canvas height (default: BOTTLE_WORDMARK_CONFIG.autoFitHeight) */
  autoFitHeight?: boolean;
  /** Target fraction of canvasHeight spanned by the wordmark (default: 0.90) */
  targetHeightCoverage?: number;
  /** Safety cap on glyph cap-height as a fraction of canvasWidth (default: 0.84) */
  maxWidthCoverage?: number;
  /** Explicit base font size override in pixels (used when autoFitHeight is false) */
  fontSizePx?: number;
  /** Optional font size multiplier relative to default can proportion (default: 1) */
  fontSizeRatio?: number;
  /** Optional global letter-spacing override in em (defaults to BOTTLE_WORDMARK_CONFIG.letterSpacingEm[textCase]) */
  letterSpacingEm?: number;
  /** Optional per-pair optical kerning overrides in em (merged over BOTTLE_WORDMARK_CONFIG.pairKerningEm) */
  pairKerningEm?: Record<string, number>;
  /** Vertical optical offset along the can spine in canvas pixels (+ up, - down) */
  verticalOffsetY?: number;
  /** Optional italic toggle (uses italic when candidate supports it) */
  italic?: boolean;
}

function measureTightKernedSpan(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSizePx: number,
  letterSpacingPx: number,
  pairKerningEm: Record<string, number>
): { totalWidth: number; widths: number[]; gaps: number[]; capHeight: number } {
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const gaps: number[] = [];

  for (let i = 1; i < chars.length; i++) {
    const pairKey = chars[i - 1] + chars[i];
    const pairPx = (pairKerningEm[pairKey] ?? 0) * fontSizePx;
    gaps.push(letterSpacingPx + pairPx);
  }

  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + gaps.reduce((sum, g) => sum + g, 0);

  const metrics = ctx.measureText(text);
  const measuredHeight =
    (metrics.actualBoundingBoxAscent ?? 0) + (metrics.actualBoundingBoxDescent ?? 0);
  const capHeight = measuredHeight > fontSizePx * 0.35 ? measuredHeight : fontSizePx * 0.74;

  return { totalWidth, widths, gaps, capHeight };
}

/**
 * Draws text glyph-by-glyph using `ctx.measureText` + global `letterSpacingPx`
 * + per-pair optical kerning (`pairKerningEm`), guaranteeing identical tight
 * editorial kerning across every browser and Chromium version.
 */
function drawTightKernedCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSizePx: number,
  letterSpacingPx: number,
  pairKerningEm: Record<string, number>
): void {
  const chars = Array.from(text);
  if (chars.length === 0) return;

  const { totalWidth, widths, gaps } = measureTightKernedSpan(
    ctx,
    text,
    fontSizePx,
    letterSpacingPx,
    pairKerningEm
  );

  let cursorX = -totalWidth / 2;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const w = widths[i];
    ctx.fillText(ch, cursorX + w / 2, 0);
    cursorX += w + (gaps[i] ?? 0);
  }
}

/**
 * Synchronously renders the high-DPI transparent full-height vertical "BOCA" wordmark
 * onto an HTMLCanvasElement suitable for `new THREE.CanvasTexture(canvas)`.
 *
 * Pass `existingCanvas` to redraw in place when swapping fonts or casing,
 * then set `texture.needsUpdate = true` in Three.js.
 */
export function renderBottleWordmarkCanvas(
  options: BottleWordmarkOptions = {},
  existingCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const {
    textCase = DEFAULT_WORDMARK_CASE,
    text,
    fontId = DEFAULT_SERIF_ID,
    width = BOTTLE_WORDMARK_CONFIG.canvasWidth,
    height = BOTTLE_WORDMARK_CONFIG.canvasHeight,
    direction = BOTTLE_WORDMARK_CONFIG.direction,
    color = BOTTLE_WORDMARK_CONFIG.color,
    subtleEtchGlow = BOTTLE_WORDMARK_CONFIG.subtleEtchGlow,
    opacity = BOTTLE_WORDMARK_CONFIG.opacity,
    autoFitHeight = BOTTLE_WORDMARK_CONFIG.autoFitHeight,
    targetHeightCoverage = BOTTLE_WORDMARK_CONFIG.targetHeightCoverage,
    maxWidthCoverage = BOTTLE_WORDMARK_CONFIG.maxWidthCoverage,
    fontSizePx = BOTTLE_WORDMARK_CONFIG.fontSizePx,
    fontSizeRatio = 1,
    letterSpacingEm,
    pairKerningEm,
    verticalOffsetY = BOTTLE_WORDMARK_CONFIG.verticalOffsetY,
    italic = false,
  } = options;

  const candidate = getSerifCandidate(fontId);
  const caseConfig = WORDMARK_CASES.find((c) => c.id === textCase) ?? WORDMARK_CASES[0];
  const resolvedText = text ?? formatWordmarkText(textCase, BOTTLE_WORDMARK_CONFIG.text);
  const canvas = existingCanvas ?? document.createElement('canvas');

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.translate(width / 2, height / 2 - verticalOffsetY);
  ctx.rotate(direction === 'up' ? -Math.PI / 2 : Math.PI / 2);

  const fontStyle = italic && candidate.supportsItalic ? 'italic' : 'normal';
  const resolvedTrackingEm =
    letterSpacingEm ??
    BOTTLE_WORDMARK_CONFIG.letterSpacingEm[textCase] + candidate.bottleTrackingEm;
  const mergedPairKerning = pairKerningEm
    ? { ...BOTTLE_WORDMARK_CONFIG.pairKerningEm, ...pairKerningEm }
    : BOTTLE_WORDMARK_CONFIG.pairKerningEm;

  let resolvedFontSize: number;
  if (autoFitHeight) {
    const refSize = 200;
    ctx.font = `${fontStyle} ${candidate.defaultWeight} ${refSize}px ${candidate.canvasFontFamily}`;
    const refMetrics = measureTightKernedSpan(
      ctx,
      resolvedText,
      refSize,
      refSize * resolvedTrackingEm,
      mergedPairKerning
    );
    const heightFitSize =
      refSize * ((height * targetHeightCoverage) / Math.max(refMetrics.totalWidth, 1));
    const widthCapSize =
      refSize * ((width * maxWidthCoverage) / Math.max(refMetrics.capHeight, 1));
    resolvedFontSize = Math.round(Math.min(heightFitSize, widthCapSize) * fontSizeRatio);
  } else {
    const heightScale = height / BOTTLE_WORDMARK_CONFIG.canvasHeight;
    resolvedFontSize = Math.round(
      fontSizePx * heightScale * candidate.bottleScale * caseConfig.scaleMultiplier * fontSizeRatio
    );
  }

  const trackingPx = resolvedFontSize * resolvedTrackingEm;

  ctx.font = `${fontStyle} ${candidate.defaultWeight} ${resolvedFontSize}px ${candidate.canvasFontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;

  if (subtleEtchGlow) {
    ctx.shadowColor = BOTTLE_WORDMARK_CONFIG.etchGlowColor;
    ctx.shadowBlur = Math.max(
      4,
      Math.round(resolvedFontSize * BOTTLE_WORDMARK_CONFIG.etchGlowBlurRatio)
    );
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  drawTightKernedCenteredText(ctx, resolvedText, resolvedFontSize, trackingPx, mergedPairKerning);

  if (subtleEtchGlow) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    drawTightKernedCenteredText(
      ctx,
      resolvedText,
      resolvedFontSize,
      trackingPx,
      mergedPairKerning
    );
  }

  ctx.restore();
  return canvas;
}

/**
 * Loads the selected serif webfont first, then renders the high-DPI full-height vertical
 * "BOCA" / "Boca" / "boca" wordmark canvas. Recommended async entry point for `@bottle-3d`.
 */
export async function renderBottleWordmarkCanvasAsync(
  options: BottleWordmarkOptions = {},
  existingCanvas?: HTMLCanvasElement
): Promise<HTMLCanvasElement> {
  await loadSerifFont(options.fontId ?? DEFAULT_SERIF_ID);
  return renderBottleWordmarkCanvas(options, existingCanvas);
}

/**
 * Canonical canvas renderer for `<BottleScene renderWordmarkCanvas={renderWordmarkCanvas} />`
 * supporting serif font + casing (`'upper' | 'title' | 'lower'` -> BOCA / Boca / boca).
 */
export function renderWordmarkCanvas(
  fontFamily?: string,
  textCase: WordmarkCase = DEFAULT_WORDMARK_CASE,
  existingCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const candidate = resolveSerifCandidate(fontFamily);
  return renderBottleWordmarkCanvas(
    { fontId: candidate.id, textCase, direction: BOTTLE_WORDMARK_CONFIG.direction },
    existingCanvas
  );
}

/** Backwards-compatible alias for `renderWordmarkCanvas`. */
export const renderWordmarkForBottleScene = renderWordmarkCanvas;

/**
 * Renders the full-height vertical texture for either side of the can:
 * - `'front'` (0 deg): uppercase `"BOCA"` bottom-to-top
 * - `'back'` (180 deg): uppercase `"WATER"` bottom-to-top
 *
 * Both sides auto-fit to `BOTTLE_WORDMARK_CONFIG.targetHeightCoverage` (90%)
 * with tight luxury editorial kerning and crisp matte-satin white ink.
 */
export function renderWordmarkSideCanvas(
  side: WordmarkSide,
  fontFamily?: string,
  existingCanvas?: HTMLCanvasElement,
  color?: string
): HTMLCanvasElement {
  const candidate = resolveSerifCandidate(fontFamily);
  const sideConfig = BOTTLE_WORDMARK_CONFIG.sides[side];
  return renderBottleWordmarkCanvas(
    {
      fontId: candidate.id,
      text: sideConfig.text,
      textCase: sideConfig.textCase,
      direction: BOTTLE_WORDMARK_CONFIG.direction,
      ...(color !== undefined ? { color } : {}),
    },
    existingCanvas
  );
}

/**
 * Async variant of `renderWordmarkSideCanvas` that awaits browser font loading first.
 */
export async function renderWordmarkSideCanvasAsync(
  side: WordmarkSide,
  fontFamily?: string,
  existingCanvas?: HTMLCanvasElement,
  color?: string
): Promise<HTMLCanvasElement> {
  const candidate = resolveSerifCandidate(fontFamily);
  await loadSerifFont(candidate.id);
  return renderWordmarkSideCanvas(side, fontFamily, existingCanvas, color);
}
