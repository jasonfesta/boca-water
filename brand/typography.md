# Boca Water — Typography & Serif Wordmark Exploration

## 1. The Vercel Serif Lineage (Research Summary)

Across Vercel's own design system and our recent WebDev Arena (WDA) builds, two closely linked serif voices define the modern Vercel editorial look:

1. **`Instrument Serif` (Primary Default — Google Fonts / WDA Vercel-Ecosystem Standard)**
   - Used across recent WDA builds paired with Vercel's Geist and Instrument Sans (`analytics-bento-showcase`, `analytics-bento-showcase-v1`, `analytics-bento-showcase-v3`, `ai-chatgpt-codex-consumer-app`, `easylog`) and listed in `design-kit/libraries/fonts.md` as the contemporary editorial pairing.
   - Condensed, tall proportions with crisp high-contrast hairlines and sculptural teardrop terminals.
   - 100% hosted on Google Fonts CSS2 (`Instrument+Serif:ital@0;1`) with zero CORS risk for Three.js `CanvasTexture` rasterization.

2. **`Geist Serif` (Vercel Native Display Serif — `geist` npm / jsDelivr CDN)**
   - Vercel's official display serif in the Geist superfamily (alongside Geist Sans, Geist Mono, and Geist Pixel), built as a high-contrast editorial homage to *Harper's Bazaar* and *Rolling Stone*.
   - Shares cap-height and x-height with Geist Sans/Mono and introduces a variable `ELSH` (Element Shape) axis for dot geometry.
   - Not yet hosted on Google Fonts; distributed via `npm i geist` (`geist/dist/fonts/geist-serif/`) and jsDelivr CDN. Included in Boca Water's live font switcher via `@font-face` with `Instrument Serif` as its seamless fallback.

---

## 2. Curated Serif Candidates for the Vertical `"Boca"` Bottle Wordmark

All candidates are strictly **non-Material** (no Roboto, Google Sans, Product Sans, or Noto) and evaluated specifically for how `"Boca"` reads **vertically bottom-to-top (`-90deg`)** along the slender cylindrical body of a crystal-clear PET sparkling water bottle.

| ID | Typeface | Source | Default Weight | Tracking | Vertical Bottle Rationale |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `instrument-serif` | **Instrument Serif** *(Default)* | Google Fonts | `400` | `0.03em` | Tall, condensed horizontal width keeps `"Boca"` slim around the cylinder's curvature so all four letters stay visible from a single front-3/4 angle without wrapping out of view. Sharp hairlines echo the crispness of chilled carbonation. |
| `geist-serif` | **Geist Serif** *(Vercel Native)* | jsDelivr / `geist` npm | `400` | `0.025em` | High-contrast saw-toothed serifs and fashion-editorial proportions give `"Boca"` a sharp contemporary-luxury presence on clear PET. Ideal if we self-host the `geist` package in production. |
| `cormorant-garamond` | **Cormorant Garamond** | Google Fonts | `500` | `0.05em` | Airy French Renaissance display serif with sculpted ascenders and delicate terminals. Vertically along clear plastic, it reads like an apothecary or alpine mineral house. Weight `500` preserves hairlines against specular PET highlights. |
| `newsreader` | **Newsreader** | Google Fonts | `400` | `0.02em` | Optical-size variable serif (`opsz 6..72`) frequently paired with Geist & Instrument Serif in WDA editorial systems. Slightly sturdier thin strokes stay rock-solid through liquid refraction and rising micro-bubbles. |
| `fraunces` | **Fraunces** | Google Fonts | `400` | `0.015em` | Sculptural soft-serif with generous organic bowls in `B`, `o`, `c`, `a`. Brings a warmer, sun-lit coastal hospitality personality while remaining unmistakably luxury editorial. |
| `bodoni-moda` | **Bodoni Moda** | Google Fonts | `500` | `0.04em` | Classic Italian Didone with strict vertical stress and dramatic thick-thin contrast. Rotated `-90deg`, its hairline stems create an architectural rhythm running straight up the bottle spine. |

---

## 3. Website Typography Pairing Matrix

Inspired by the calm dark-mode minimalism of `history-of-orbs` and `coastal-drive` (both built on `Instrument Sans`), Boca Water pairs the selectable display serif with a restrained neo-grotesk UI face and a crisp monospace for tabular numerals.

| Role | CSS Token | Typeface | Weights | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Wordmark** | `--font-display` | **Instrument Serif** *(swappable across all 6 candidates)* | `400` (regular & italic) | Bottle `"Boca"` wordmark, hero headline, editorial section titles, pack headers |
| **UI & Body Sans** | `--font-sans` | **Instrument Sans** | `400`, `500`, `600` | Navigation, body copy, product descriptions, cart & checkout controls |
| **Data & Pricing Mono** | `--font-mono` | **Fragment Mono** | `400` | Pack counts (`1×`, `6×`, `24×`), pricing (`$4.50`, `$24.00`, `$84.00`), volume (`330 ML`), `font-variant-numeric: tabular-nums` |

### Strict Taste Compliance
- **Zero Material fonts**: No Roboto, Google Sans, Product Sans, or Noto anywhere.
- **No overused AI defaults**: Avoids Inter, Space Grotesk, Manrope, and Plus Jakarta Sans.
- **No purple/violet**: Typography inks use pure mineral off-white (`#f4f5f6`), cool mist gray (`#a1a7b0`), and subtle hairline borders on obsidian dark surfaces (`#060709`).
- **Tabular numerals**: Every price, pack size, savings percentage, and cart quantity uses `tabular-nums`.

---

## 4. Embed & Loading Snippets

### Google Fonts `<link>` Tags (for `website/index.html`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Fragment+Mono:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,400..600&family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..500&display=swap"
  rel="stylesheet"
/>
```

### Vercel Native `Geist Serif` (`@font-face` via jsDelivr)

Injected automatically on demand by `ensureGeistSerifLoaded()` in `website/src/styles/typography.ts` (or paste into `index.css`):

```css
@font-face {
  font-family: 'Geist Serif';
  src: url('https://cdn.jsdelivr.net/npm/geist@latest/dist/fonts/geist-serif/GeistSerif-Regular.woff2')
    format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### Tailwind v4 Theme Tokens (for `website/src/index.css`)

```css
@theme {
  --font-display: "Instrument Serif", Georgia, serif;
  --font-sans: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Fragment Mono", ui-monospace, SFMono-Regular, monospace;
}
```

---

## 5. Vertical Sleek Can Wordmark Guidelines (`@bottle-3d`)

Per the reference vessel (sleek **12 FL OZ / 355mL crystal-clear PET beverage can**, ~1:2.65 diameter-to-height ratio, smoothly rounded domed-punt heel, short neck-in taper with clear lid/pull-tab, and visible top headspace air pocket), the can carries **only** the vertical serif wordmark running up its straight cylindrical side — zero color bands or nutrition text:

- **Orientation**: Rotated `-90deg` (counter-clockwise) so the reader's eye travels **upward** from the lower-middle straight body toward the upper body (staying cleanly below the headspace air-pocket bubble and above the rounded bottom heel).
- **Live Casing Exploration (`title` | `upper` | `lower`)**:
  - **Title (`Boca`)** *(default)*: Baseline optical scale (`1.0×`), balanced classical editorial hierarchy.
  - **Uppercase (`BOCA`)**: Scaled to `0.84×` with `+0.09em` added tracking so all four capitals read like an architectural luxury monolith up the cylinder without crowding the can's top/bottom curves.
  - **Lowercase (`boca`)**: Scaled to `1.04×` with `-0.005em` tighter tracking for a sculptural, contemporary-minimalist silhouette.
- **Finish on Crystal-Clear PET**: Render as crisp, lightly frosted mineral-white silkscreen/etch (`rgba(248, 250, 252, 0.94)`) with a barely perceptible soft halo (`subtleEtchGlow: true`) so thin serifs remain razor-sharp over both refracted sparkling water and the dark studio backdrop.
- **Standalone Editable Part (`website/src/styles/bottleWordmark.ts`)**: All bottle wordmark copy, sizing, ink finish, vertical spine offset, and **tight luxury editorial kerning** live in `BOTTLE_WORDMARK_CONFIG` (`letterSpacingEm`: `-0.045` for `Boca`/`boca`, `-0.015` for `BOCA`, plus explicit per-pair optical kerning overrides for `Bo`, `oc`, `ca`, `bo`, `BO`, `OC`, `CA`). Rendered glyph-by-glyph via `ctx.measureText` + per-pair kerning so tight kerning stays identical across every Chromium/Safari build. All symbols are re-exported from `website/src/styles/typography.ts` for backwards compatibility.
- **Texture Resolution & API**: `1024 × 2048` high-DPI RGBA canvas via `renderWordmarkCanvas(fontFamily, textCase)` (or `renderBottleWordmarkCanvasAsync({ fontId, textCase }, existingCanvas)`). Pass the existing `HTMLCanvasElement` to redraw in place and set `texture.needsUpdate = true` for instant font & case switching.
