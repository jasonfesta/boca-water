# Boca Water — Website & Design-Kit Integration Guide

Scroll-driven 3D luxury web experience for **Boca Sparkling Water** (12 fl oz / 355 mL crystal-clear PET vessel), built on the Golden Template React 19 + Vite 7 + Tailwind CSS v4 + Three.js + Motion + Shadcn UI + Stripe architecture.

---

## Stack & Architecture

| Layer | Technology | Notes |
| :--- | :--- | :--- |
| **Framework & Bundler** | `react@19.2.3`, `vite@7.2.4`, `typescript@5.9.3`, `vite-plugin-singlefile@2.3.0` | Compiles locally into a standalone single-file `dist/index.html` (`base: './'`). |
| **Styling & UI Primitives** | `tailwindcss@4.1.17` (`@tailwindcss/vite`), `tw-animate-css`, `shadcn/ui` (`new-york`), `@radix-ui/react-*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` | Zero Material fonts, zero purple/violet hues (OKLCH 270–330 banned), optical `-2px` downward vertical centering on all `<button>` elements. |
| **Motion & Scroll** | `motion` (`motion/react`), `gsap`, `lenis` | Root `<MotionConfig reducedMotion="user">`, compositor-only springs (`MotionScore` S-tier), Lenis smooth scroll feeding continuous scroll progress into Three.js. |
| **3D Stage & Dark-Field Studio** | `three`, procedural crystal-clear PET can (`src/scene/`) | Pure obsidian dark-field stage (`#030304`), dual grazing bright-rim studio strip softboxes with center negative fill, crystal-clear PET body + domed punt + clear seamed pull-tab lid, headspace air pocket, rising sparkling carbonation bubbles, and vertical serif wordmark texture. |
| **Typography** | `Instrument Serif` (default) + `Geist Serif`, `Cormorant Garamond`, `Newsreader`, `Fraunces`, `Bodoni Moda` paired with `Instrument Sans` & `Fragment Mono` | Live serif + casing (`Boca` / `BOCA` / `boca`) tester in `WordmarkTester.tsx` synced to `--font-display` and the 3D can `CanvasTexture` (`src/styles/typography.ts`). |
| **E-Commerce & Payments** | `@stripe/stripe-js`, `@stripe/react-stripe-js`, `src/commerce/` | 1-Pack, 6-Pack, and 24-Pack catalog, persistent CartContext, slide-over CartDrawer, and 4-step Stripe CheckoutFlow with Payment Element + test-mode fallback (`STRIPE.md`). |

---

## Available `~/design-kit` Resources, Libraries, Registries & MCP Servers

This project is wired into the full `~/design-kit` ecosystem (503 skills · 30 agents · 14 plugins · 16 live MCP servers · 45 design systems).

### 1. Shadcn UI & Configured Component Registries (`components.json`)

| Registry | Endpoint / Local Source | What It Provides |
| :--- | :--- | :--- |
| **`@shadcn`** | Built-in (`style: "new-york"`, `iconLibrary: "lucide"`) | Canonical Radix + Tailwind v4 copy-paste primitives (`src/components/ui/`). |
| **`@fluid`** | `https://www.fluidfunctionalism.com/r/{name}.json` (local clone in `~/wda/fluid-functionalism`) | 83 spring-first components (`spring.fast` / `spring.moderate` / `spring.slow`), gliding fluid hover, and ghost-span `opsz` weight shifts. |
| **`@easeui`** | `https://easeui.dev/r/{name}.json` (local cache in `~/wda/easeui-registry`) | 54 motion-first React components (`number-ticker`, `drawer`, `insight-card`, `command-palette`, `hold-to-confirm`, plus 12 AI components). |
| **`@kokonutui`** | `https://kokonutui.com/r/{name}.json` | ~120 animated backgrounds, cards, navigation, inputs, and buttons. |
| **`@react-bits`** | `https://reactbits.dev/r/{name}.json` | 217+ animated text, shader backgrounds, and micro-interactions (`-TS-TW` variants). |
| **`@spectrumui`** | `https://ui.spectrumhq.in/r/{name}.json` | 250+ animated components, tables, charts, and pricing blocks. |
| **`@plush`** | `https://plush-ui.pages.dev/r/{name}.json` (local copy in `~/design-kit/libraries/sources/plush-ui`) | 23 soft tactile Radix + Tailwind primitives. |
| **`@designme`** | `https://designme.dev/r/shadcn/{name}.json` (local copy in `~/design-kit/libraries/sources/designme`) | 125 zero-extra-dependency React 19 UI components. |
| **`@magicui` / `@aceternity`** | Available via the `shadcn` MCP (`~/design-kit/mcp/shadcn/components.json`) | Animated landing & marketing motion blocks. |

### 2. Motion & Scroll Libraries (`~/design-kit/libraries/motion.md`)

| Library | Package | Role in Boca Water / Design-Kit |
| :--- | :--- | :--- |
| **Motion** | `motion` (`motion/react`) | Primary React spring, gesture, `AnimatePresence`, and shared-layout (`layoutId`) engine. |
| **GSAP** | `gsap` | Imperative timeline sequencing, `ScrollTrigger`, `SplitText`, and precision scrubbing. |
| **Lenis** | `lenis` | Silky smooth scroll choreography synchronized with Three.js `requestAnimationFrame` camera/bottle keyframes. |
| **tw-animate-css** | `tw-animate-css` | Tailwind v4 `@keyframes` enter/exit utilities for Shadcn overlays. |
| **CSS `linear()` Springs** | Native CSS / Motion MCP | Zero-JS compositor springs for hover and reveal transitions. |
| **Additional Catalog Options** | `@number-flow/react`, `torph`, `@lottiefiles/dotlottie-react`, `@rive-app/react-canvas`, `@paper-design/shaders-react`, `dialkit`, `leva` | Documented in `~/design-kit/libraries/motion.md` for future iterations. |

### 3. Headless UI & Component Catalog (`~/design-kit/libraries/ui-primitives.md`)

- **Default Primitive Family**: Radix UI (`@radix-ui/react-*` / `radix-ui`) — never mixed with Base UI in the same app.
- **Additional Catalog**: Base UI (`@base-ui/react`), React Aria Components, Ark UI, Floating UI, `ui-sdk` (`@ui-sdk/react`), `sonner`, `cmdk`, `vaul`, `embla-carousel-react`, `react-hook-form` + `zod`, `@tanstack/react-table`.

### 4. Live Design-Kit MCP Servers (`~/design-kit/mcp/README.md`)

| MCP Server | Plugin | Capabilities |
| :--- | :--- | :--- |
| **`shadcn`** | `ui-libraries` | Search, inspect, and install from `@shadcn`, `@magicui`, `@aceternity`, `@kokonutui`, `@react-bits`, `@spectrumui`, `@fluid`, `@easeui`. |
| **`21st`** | `ui-libraries` | 21st.dev component search, themes, logos, and inspiration (51 tools). |
| **`spectrumui`** | `ui-libraries` | Browse and install Spectrum UI components. |
| **`magicui`** | `ui-libraries` | Magic UI animated marketing components. |
| **`motion`** | `motion-craft` | Official Motion AI Kit docs search, component insertion, and CSS `linear()` spring generation (`https://mcp.motion.dev`). |
| **`context7`** | `design-mcp` | Up-to-date documentation for any library (Three.js, React 19, Stripe, Tailwind v4). |
| **`deepwiki`** | `design-mcp` | Repository-level Q&A over public GitHub projects. |
| **`tailwind-docs`** | `design-mcp` | Tailwind CSS v4 documentation and utility reference. |
| **`threejs-docs`** | `design-mcp` | Three.js API docs, PBR materials, PMREM, and examples. |
| **`google-fonts-docs`** | `design-mcp` | Google Fonts metadata, variable axes, and licenses. |
| **`iconify`** | `design-mcp` | Search 200k+ vector icons and SVG previews. |
| **`color` & `palette`** | `design-mcp` | OKLCH/HSL conversion, WCAG contrast audits, 50–900 scales, and Tailwind/CSS token export. |
| **`excalidraw`** | `design-mcp` | Architecture diagrams and wireframes. |
| **`chrome-devtools` & `playwright`** | `design-mcp` | Headless Chromium screenshots (1280px desktop + 390px mobile), DOM/CSS inspection, Lighthouse, and responsive QA. |

### 5. Installed Design-Kit Plugins & Rules (`~/design-kit/INDEX.md`)

- **Always-On Rules**: `design-donts.md` (`lint_donts.py`), `design-kit-taste.md`, `golden-template-react.md`.
- **Core Plugins**: `design-pipeline`, `dev-pipeline` (including `local-build-preview`), `motion-craft`, `ui-libraries`, `3d-photoreal`, `kit-meta`, `design-mcp`, plus imported packs (`design-craft`, `platform-design`, `design-tooling`, `ux-content`, `web-effects`, `threejs-games`).

---

## Local Development & Verification

```bash
# Type-check
./node_modules/.bin/tsc --noEmit

# Production single-file build (outputs dist/index.html)
./node_modules/.bin/vite build

# Design Don'ts lint gate
python3 ~/design-kit/skills/design-donts/scripts/lint_donts.py /usr/local/google/home/jfesta/bocawater/website
```

See [STRIPE.md](./STRIPE.md) for Stripe CLI, Price IDs, and backend checkout session setup.
