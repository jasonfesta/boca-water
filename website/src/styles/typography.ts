/**
 * Boca Water — Typography System & Serif Candidate Registry
 *
 * Strict compliance:
 * - Zero Material fonts (no Roboto, Google Sans, Product Sans, Noto).
 * - Default display serif: Instrument Serif (Vercel-ecosystem WDA standard on Google Fonts),
 *   with Vercel's native Geist Serif + 4 curated editorial serifs available for switching.
 * - Paired with Roboto (UI/body/nav/Shop — explicit user override) + Fragment Mono (tabular-nums).
 * - Bottle wordmark rendering & tight kerning config live in `./bottleWordmark.ts`
 *   (re-exported below for backwards compatibility).
 */

export type SerifFontId =
  | 'instrument-serif'
  | 'geist-serif'
  | 'cormorant-garamond'
  | 'newsreader'
  | 'fraunces'
  | 'bodoni-moda';

export interface SerifFontCandidate {
  id: SerifFontId;
  name: string;
  foundry: string;
  source: 'google-fonts' | 'jsdelivr-cdn';
  isDefault: boolean;
  vercelRelation: string;
  cssFamily: string;
  canvasFontFamily: string;
  defaultWeight: number;
  supportsItalic: boolean;
  /** Per-font tracking delta in em added to BOTTLE_WORDMARK_CONFIG.letterSpacingEm */
  bottleTrackingEm: number;
  /** Calibrated optical scale multiplier so all candidates occupy consistent vertical height */
  bottleScale: number;
  editorialRole: string;
  verticalReadabilityRationale: string;
}

export const DEFAULT_SERIF_ID: SerifFontId = 'instrument-serif';

export const GOOGLE_FONTS_PRECONNECT_URLS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
] as const;

export const GOOGLE_FONTS_CSS2_URL =
  'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Fragment+Mono:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,400..600&family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..500&family=Roboto:wght@400;500;700&display=swap';

export const GEIST_SERIF_WOFF2_URL =
  'https://cdn.jsdelivr.net/npm/geist@latest/dist/fonts/geist-serif/GeistSerif-Regular.woff2';

export const GEIST_SERIF_FONT_FACE_CSS = `@font-face {
  font-family: 'Geist Serif';
  src: url('${GEIST_SERIF_WOFF2_URL}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}`;

export const FONT_CANDIDATES: readonly SerifFontCandidate[] = [
  {
    id: 'instrument-serif',
    name: 'Instrument Serif',
    foundry: 'Rodrigo Fuenzalida / Instrument',
    source: 'google-fonts',
    isDefault: true,
    vercelRelation: 'WDA Vercel-ecosystem editorial standard',
    cssFamily: '"Instrument Serif", Georgia, serif',
    canvasFontFamily: '"Instrument Serif", Georgia, serif',
    defaultWeight: 400,
    supportsItalic: true,
    bottleTrackingEm: 0,
    bottleScale: 1.08,
    editorialRole: 'Condensed high-contrast display serif',
    verticalReadabilityRationale:
      'Tall, narrow proportions keep "Boca" sleek along the slender PET cylinder without wrapping out of view.',
  },
  {
    id: 'geist-serif',
    name: 'Geist Serif',
    foundry: 'Vercel',
    source: 'jsdelivr-cdn',
    isDefault: false,
    vercelRelation: 'Vercel native display serif (Geist family)',
    cssFamily: '"Geist Serif", "Instrument Serif", Georgia, serif',
    canvasFontFamily: '"Geist Serif", "Instrument Serif", Georgia, serif',
    defaultWeight: 400,
    supportsItalic: false,
    bottleTrackingEm: 0,
    bottleScale: 1.0,
    editorialRole: 'Fashion-editorial display serif',
    verticalReadabilityRationale:
      'High-contrast saw-toothed serifs and crisp downstrokes bring Vercel’s fashion-magazine display voice directly to the bottle.',
  },
  {
    id: 'cormorant-garamond',
    name: 'Cormorant Garamond',
    foundry: 'Catharsis Fonts',
    source: 'google-fonts',
    isDefault: false,
    vercelRelation: 'High-fashion French editorial serif',
    cssFamily: '"Cormorant Garamond", Georgia, serif',
    canvasFontFamily: '"Cormorant Garamond", Georgia, serif',
    defaultWeight: 500,
    supportsItalic: true,
    bottleTrackingEm: -0.008,
    bottleScale: 1.04,
    editorialRole: 'French Renaissance display serif',
    verticalReadabilityRationale:
      'Airy sculpted ascenders and apothecary elegance; weight 500 holds hairline clarity over sparkling bubbles.',
  },
  {
    id: 'newsreader',
    name: 'Newsreader',
    foundry: 'Production Type',
    source: 'google-fonts',
    isDefault: false,
    vercelRelation: 'WDA editorial serif co-paired with Geist',
    cssFamily: '"Newsreader", Georgia, serif',
    canvasFontFamily: '"Newsreader", Georgia, serif',
    defaultWeight: 400,
    supportsItalic: true,
    bottleTrackingEm: -0.004,
    bottleScale: 0.96,
    editorialRole: 'Optical-size editorial serif',
    verticalReadabilityRationale:
      'Sturdier hairlines preserve crisp legibility through curved PET liquid refraction and carbonation.',
  },
  {
    id: 'fraunces',
    name: 'Fraunces',
    foundry: 'Undercase Type',
    source: 'google-fonts',
    isDefault: false,
    vercelRelation: 'Sculptural coastal soft-serif',
    cssFamily: '"Fraunces", Georgia, serif',
    canvasFontFamily: '"Fraunces", Georgia, serif',
    defaultWeight: 400,
    supportsItalic: true,
    bottleTrackingEm: -0.004,
    bottleScale: 0.94,
    editorialRole: 'Warm organic soft-serif',
    verticalReadabilityRationale:
      'Generous bowls in B, o, c, a give the vertical bottle mark a warm, tactile coastal hospitality presence.',
  },
  {
    id: 'bodoni-moda',
    name: 'Bodoni Moda',
    foundry: 'Indestructible Type',
    source: 'google-fonts',
    isDefault: false,
    vercelRelation: 'Italian Didone luxury display',
    cssFamily: '"Bodoni Moda", Georgia, serif',
    canvasFontFamily: '"Bodoni Moda", Georgia, serif',
    defaultWeight: 500,
    supportsItalic: true,
    bottleTrackingEm: -0.008,
    bottleScale: 0.96,
    editorialRole: 'High-contrast Didone luxury serif',
    verticalReadabilityRationale:
      'Strict vertical stress turns the -90deg rotated wordmark into an architectural hairline spine up the bottle.',
  },
] as const;

export const TYPOGRAPHY_TOKENS = {
  defaultSerifId: DEFAULT_SERIF_ID,
  display: '"Instrument Serif", Georgia, serif',
  sans: '"Roboto", ui-sans-serif, system-ui, sans-serif',
  sansFamily: '"Roboto", ui-sans-serif, system-ui, sans-serif',
  mono: '"Fragment Mono", ui-monospace, SFMono-Regular, monospace',
} as const;

export function getSerifCandidate(id: SerifFontId = DEFAULT_SERIF_ID): SerifFontCandidate {
  return FONT_CANDIDATES.find((c) => c.id === id) ?? FONT_CANDIDATES[0];
}

/**
 * Resolves a SerifFontId, display name, or CSS font-family string to the matching
 * candidate (falling back to the default Instrument Serif candidate).
 */
export function resolveSerifCandidate(fontIdOrFamily?: string): SerifFontCandidate {
  if (!fontIdOrFamily) return getSerifCandidate(DEFAULT_SERIF_ID);
  const needle = fontIdOrFamily.toLowerCase();
  const match = FONT_CANDIDATES.find(
    (c) =>
      c.id === needle ||
      needle.includes(c.name.toLowerCase()) ||
      c.cssFamily.toLowerCase() === needle
  );
  return match ?? getSerifCandidate(DEFAULT_SERIF_ID);
}

let geistStyleInjected = false;

/**
 * Idempotently injects the @font-face rule for Vercel's native Geist Serif (via jsDelivr).
 * Safe to call in SSR or browser environments.
 */
export function ensureGeistSerifStyle(): void {
  if (geistStyleInjected || typeof document === 'undefined') return;
  const existing = document.getElementById('boca-geist-serif-font');
  if (!existing) {
    const style = document.createElement('style');
    style.id = 'boca-geist-serif-font';
    style.textContent = GEIST_SERIF_FONT_FACE_CSS;
    document.head.appendChild(style);
  }
  geistStyleInjected = true;
}

/**
 * Updates the live `--font-display` CSS variable on `:root` so editorial headlines
 * and UI display elements stay in sync with the 3D bottle wordmark font.
 */
export function applySerifFontToDocument(id: SerifFontId): SerifFontCandidate {
  const candidate = getSerifCandidate(id);
  if (candidate.id === 'geist-serif') {
    ensureGeistSerifStyle();
  }
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--font-display', candidate.cssFamily);
    document.documentElement.dataset.serifFont = candidate.id;
  }
  return candidate;
}

/**
 * Awaits browser font loading for the requested serif candidate with a safe timeout
 * so 3D CanvasTexture generation never stalls if offline or blocked.
 */
export async function loadSerifFont(
  id: SerifFontId = DEFAULT_SERIF_ID,
  timeoutMs = 2500
): Promise<SerifFontCandidate> {
  const candidate = getSerifCandidate(id);
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return candidate;
  }

  if (candidate.id === 'geist-serif') {
    ensureGeistSerifStyle();
  }

  const fontSpec = `${candidate.defaultWeight} 120px ${candidate.canvasFontFamily}`;
  try {
    await Promise.race([
      document.fonts.load(fontSpec, 'Boca'),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    // Graceful fallback to loaded serif stack if network is unavailable.
  }

  return candidate;
}

// Re-export standalone editable bottle wordmark module so existing imports stay intact.
export {
  BOTTLE_WORDMARK_CONFIG,
  DEFAULT_WORDMARK_CASE,
  WORDMARK_CASES,
  formatWordmarkText,
  renderBottleWordmarkCanvas,
  renderBottleWordmarkCanvasAsync,
  renderWordmarkCanvas,
  renderWordmarkForBottleScene,
  renderWordmarkSideCanvas,
  renderWordmarkSideCanvasAsync,
  type BottleWordmarkOptions,
  type WordmarkCase,
  type WordmarkCaseOption,
  type WordmarkSide,
} from './bottleWordmark';
