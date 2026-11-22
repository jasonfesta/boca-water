# Boca Water — 3D Vessel Architecture & Iteration Notes

## Overview

The Boca Water hero vessel is a **sleek 12 fl oz (355mL) crystal-clear PET beverage can** rendered procedurally in Three.js (`website/src/scene/`) against a pure dark-field studio backdrop.

### Module Ownership & Files

| File | Responsibility |
| :--- | :--- |
| `website/src/scene/types.ts` | Shared TypeScript interfaces (`ScrollState`, `BottleLightingRig`, `BackdropHandle`, `BottleTuneParams`, `BottleSceneProps`, `WordmarkCase`). |
| `website/src/scene/bottleGeometry.ts` | Procedural 12 fl oz (355mL) crystal-clear PET can geometry, rounded hemispherical heel + thick domed base punt, crystal-clear seamed lid & pull-tab, dark-field Fresnel rim optical layer, and vertical serif wordmark mesh. |
| `website/src/scene/sparklingWater.ts` | Interior sparkling water liquid volume, concave capillary meniscus, luminous waterline ring, buoyant top headspace air-pocket lens, 520 rising micro-bubbles, and 400 clinging wall carbonation pearls. |
| `website/src/scene/scrollRig.ts` | 5-chapter C2-continuous scroll choreography (`hero` → `silhouette` → `bubbles` → `cap` → `pack`), exponential damping, subtle levitation, pointer parallax, and drag-to-spin inspection. |
| `website/src/scene/BottleScene.tsx` | React Three.js stage mounting renderer, lighting rig, backdrop, vessel, floor reflection pool, font-ready wordmark sync, and ResizeObserver lifecycle. |
| `website/src/scene/lighting.ts` | Dark-field PMREM studio strip softboxes & rim lights (owned by `@lighting-3d`). |
| `website/src/scene/backdrop.ts` | Pure dark Orb-inspired atmospheric backdrop (owned by `@lighting-3d`). |

---

## Vessel Geometry & Material Decisions

1. **Sleek 12 fl oz (355mL) PET Can Silhouette** (aligned to user reference photos):
   - Height-to-diameter ratio `~2.65:1` (`bottleHeight: 2.28`, `bodyRadius: 0.43`).
   - **Rounded hemispherical heel & thick clear domed base punt**: Smooth cosine-eased heel curve transitioning into a standing contact ring and an optically thick inner domed punt recess.
   - **Short neck-in taper & crystal-clear seamed pull-tab lid**: Classic rolled double-seam can rim, recessed lid deck, scored drink aperture contour, center rivet, and extruded beveled pull-tab — all rendered in **completely clear PET / translucent acrylic** (no opaque silver aluminum).

2. **Crystal-Clear PET Plastic (NOT Glass)**:
   - Refractive index `petIor: 1.57` (true PET plastic vs. 1.50 soda-lime glass), ultra-thin wall (`petThickness: 0.14`), crisp `clearcoat: 1.0`, faint blow-molded axial micro-bump (`bumpScale: 0.0007`), and clean neutral-cool attenuation (`#f1f8fd`, zero green bottle-glass cast, zero purple).
   - **Dark-Field Bright-Rim Fresnel Layer**: Dedicated additive Fresnel grazing rim (`pow(1 - |N·V|, 3.8)`) biased toward left/right studio strip angles so the left and right edges trace razor-sharp white lines against pure `#020203` black while keeping the center of the clear can deeply transparent.

3. **Sparkling Water & Headspace Air-Pocket**:
   - Liquid fills high (`waterFillLevel: 0.922`) with a bright waterline meniscus ring and a sculpted translucent **top headspace air-pocket bubble** that shifts gently as the can tilts.
   - 920 instanced micro-bubbles (520 rising with helical wobble + scroll-velocity agitation, 400 clinging to the inner PET walls) with zero per-frame allocations.

4. **Vertical Serif Wordmark (`Boca` / `BOCA` / `boca`)**:
   - Curved cylindrical print running **UP** along the side of the can (`-90°` rotated high-DPI `1024×2048` transparent canvas).
   - No other graphics, color bands, or nutrition text yet.
   - Live-switchable across serif font families (`fontFamily`) and casing (`textCase: 'title' | 'upper' | 'lower'`) via `website/src/styles/typography.ts`.

---

## Rapid Multi-Pass Tuning Guide

All physical and optical knobs are centralized in `DEFAULT_BOTTLE_TUNE_PARAMS` (`website/src/scene/types.ts`) and can also be overridden live via `<BottleScene tuneParams={{ ... }} />`:

- **Edge brightness / dark-field rim**: Tune `petEnvMapIntensity`, `petSpecularIntensity`, or `fresnelRimMaterial.uniforms.uRimStrength` / `uRimPower` in `bottleGeometry.ts`.
- **Clarity vs. chilled frost**: Tune `petRoughness` (`0.042` ultra-glossy crystal → `0.11` chilled condensation haze).
- **Clear pull-tab readability**: Tune `capRoughness` (`0.068`) and `clearDetailMaterial.opacity` (`0.34`).
- **Carbonation density**: Tune `risingBubbleCount`, `wallBubbleCount`, and `bubbleRiseSpeed`.
- **Scroll choreography**: Edit `BOTTLE_SCROLL_KEYFRAMES` in `website/src/scene/scrollRig.ts`.
- **Pointer spring oscillation**: Tune `stiffness` (`26.0`) and `damping` (`5.4`) in `createScrollChoreographyRig()` (`scrollRig.ts`).
- **3D Pack Formations (`1-pack` / `6-pack` / `24-pack`)**: Pass `packMode`, `packExpanded`, and `onCanTap` to `<BottleScene />`. Satellite cans in `6-pack` (2×3) and `24-pack` (4×6) reuse `hero.sharedResources` for 60fps performance and puff/unravel outward via staggered 2nd-order springs (`createPackFormationManager` in `bottleGeometry.ts`) when entering the Shop / Pack section (`progress >= 0.78`).

