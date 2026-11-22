# Boca Water — 5-Pass 3D Bottle Photoreal Study Log

Comparing every build (`study-01.png` → `study-05.png`, 1280×800 headless WebGL) directly against:
- **Vessel form refs (3 Orka 12 fl oz / 355mL crystal-clear PET can photos)**: rounded hemispherical heel, thick clear domed base punt, short neck-in taper, seamed beverage can lid + pull-tab (in crystal-clear PET/acrylic), refractive crystal-clear water + signature teardrop headspace air pocket + chilled condensation sheen.
- **Lighting & dark-mode refs**: Orbs dark-mode luminous studio depth + spotlight floor pool (`#060607` base, zero purple), razor-sharp grazing bright-rim PET silhouette, dark-clear center negative fill, tactile matte-satin full-height vertical `BOCA` sticker on front & back (`0°` & `180°`).

---

## Study Pass 1 (`study-01.png`) — Score: 72 / 100
- **What works**:
  - Sleek 12 fl oz crystal-clear PET can silhouette, clear seamed pull-tab lid, rounded heel, and domed base punt match the Orka vessel proportions closely.
  - Orka teardrop headspace air pocket is immediately recognizable and sculptural.
  - Full-height vertical `BOCA` is commanding and clean; minimal header (`BOCA water` / `About Press Shop`) has zero slop.
- **Brutal Critique (Issues to Fix in Pass 2)**:
  1. **Twin bright vertical "inner straw/tube" columns behind `BOCA`**: Two thick vertical white reflection pillars cut straight down the center of the can (caused by `scene.environment` softboxes reflecting off the inner refractive liquid cylinder + `BackSide` inner PET wall).
  2. **Hero framing collision**: The word `"between"` in the hero subtitle touches the left edge of the can, and the bottom punt almost clips the bottom of the 800px viewport.
  3. **`BOCA` top-edge overlap**: At `arcHeightFraction: 0.84, yOffset: 0.0`, the top of the `A` slightly clips over the bottom tip of the teardrop headspace air pocket.
  4. **Orbs dark-mode backdrop depth too dim**: Background reads nearly flat black instead of Orbs' luminous dimensional dark-mode studio glow + gallery spotlight floor pool.
- **Changes applied for Pass 2**:
  - `scrollRig.ts`: Shifted hero `bottlePos` from `[0.24, -0.02, 0]` → `[0.46, 0.04, 0]`, `bottleScale: 0.96`, `cameraPos.z: 4.42` for generous text clearance and full base-punt breathing room.
  - `bottleWordmarkMesh.ts`: Tuned `arcHeightFraction: 0.78`, `yOffset: -0.04`, `emissiveIntensity: 0.12`, `opacity: 0.94` so `BOCA` sits cleanly from rounded heel to teardrop base with true matte-satin sticker tactility.
  - `bottleGeometry.ts`: Zeroed `petInnerMaterial.envMapIntensity` (`0.0`) and `opacity: 0.025`.
  - Coordinated with `@liquid-3d` (remove inner liquid cylinder vertical tube reflections) and `@lighting-3d` (lift Orbs dark-mode background depth light + spotlight floor visibility).

---

## Study Pass 2 (`study-02.png`) — Score: 80 / 100
- **What improved**:
  - Orbs dark-mode luminous studio depth (`#060607` → `#2c333d`) is now visibly alive and dimensional behind the clear PET can (huge leap from Pass 1's flat black!).
  - Liquid-glass `BOCA water` title, frosted Drive `Continue` button, and `Shop About Press` header look museum-grade.
  - Full rounded base heel and domed punt now sit cleanly inside the viewport with bottom breathing room.
- **Brutal Critique (Issues to Fix in Pass 3)**:
  1. **Twin vertical white reflection bars at `x/R = ±0.38` STILL visible behind `BOCA`**: Physics root cause isolated! On a vertical cylinder, any bright front-quadrant softbox in the equirectangular HDR map at azimuth `±47°` (`(-0.58, 0.62, 0.53)` & `(0.72, 0.18, 0.67)` lifted from Orbs 3D's sphere rig) stretches into a straight vertical white pillar at `x/R = sin(±47° / 2) = ±0.39` across `petOuterMaterial`'s glossy clearcoat!
  2. **Hero text clearance**: The `"r"` of `"BOCA water"` still slightly kisses the left silhouette edge of the can.
  3. **Teardrop clearance**: Top of the `A` still slightly kisses the bottom arc of the Orka teardrop air pocket.
- **Changes applied for Pass 3**:
  - `scrollRig.ts`: Shifted hero `bottlePos[0]` from `0.46` → `0.64`, `cameraTarget[0]` → `0.16`, `cameraPos[2]` → `4.52` so `"BOCA water"` has generous clean separation from the can.
  - `bottleWordmarkMesh.ts`: Refined `arcHeightFraction: 0.74`, `yOffset: -0.09` so `BOCA` sits crisply from heel to just below the Orka teardrop air pocket.
  - `bottleGeometry.ts`: Tuned `petOuterMaterial` (`roughness: 0.056`, `clearcoat: 0.92`, `clearcoatRoughness: 0.068`, `envMapIntensity: 1.18`) for authentic clear PET sheen instead of chrome-like front reflections.
  - Sent exact cylinder-reflection physics diagnosis to `@lighting-3d` to remove the `±47°` front-quadrant softboxes from `buildStudioScrimEnvMap` and keep the front cylinder reflection zone (`-105°..+105°`) negative-filled.

---

## Study Pass 3 (`study-03.png`) — Score: 90 / 100
- **What improved**:
  - **100% elimination of the twin vertical center "straw" bars** (after `@lighting-3d` fixed the 180° `equirectUv` azimuth wrap in `lighting.ts` + our zeroed `petInnerMaterial.envMapIntensity`).
  - Razor-crisp pure white dark-field outer PET silhouette edges from lid seam around the rounded heel into the domed punt, with a crystal-clear center refracting the luminous Orbs dark-mode backdrop.
  - Generous, clean horizontal separation between the liquid-glass `"BOCA water"` hero headline on the left and the crystal-clear PET can on the right.
- **Brutal Critique (Issues to Fix in Pass 4)**:
  1. **Micro-overlap at top of `A`**: The top serif of `A` still barely kisses the bottom apex of the Orka teardrop air pocket by ~6px.
  2. **Clear pull-tab & domed punt sculptural pop**: The clear seamed pull-tab and thick domed base punt can catch slightly sharper injection-molded PET bevel highlights.
  3. **Sparkling water & chilled droplets slightly shy**: At 1280px hero distance, the delicate rising sparkling nucleation streams and chilled condensation beads are ~25% too subtle.
- **Changes applied for Pass 4**:
  - `bottleWordmarkMesh.ts`: Shifted `yOffset: -0.145`, `arcHeightFraction: 0.71` for crisp optical clearance below the Orka teardrop air pocket while spanning the full straight body.
  - `bottleGeometry.ts`: Upgraded clear pull-tab bevels (`depth: 0.016, bevelSize: 0.0065, bevelSegments: 4`), bumped `clearDetailMaterial.opacity` (`0.34 → 0.42`, `envMapIntensity: 1.95`), and refined `baseRingGeo` (`R * 0.62`, tube `0.0125`).
  - Pinged `@liquid-3d` for a subtle +25% visibility lift on rising micro-bubbles & chilled condensation droplets.

---

## Study Pass 4 (`study-04.png`) — Score: 95 / 100
- **What improved**:
  - Clean optical breathing room between the bottom apex of the Orka teardrop headspace air pocket and the top serif of `A`, while `B` still anchors cleanly above the rounded heel.
  - `@liquid-3d`'s +25–30% colorless micro-bubble & chilled droplet polish makes the cold effervescence and fine surface dewdrops read effortlessly at 1280px without any snowglobe clutter.
  - Clear pull-tab bevels (`bevelSegments: 4`) and domed base punt ring (`R * 0.62`) pop cleanly with crystal PET refraction.
- **Micro-Polish for Pass 5**:
  - Nudge hero `bottlePos[1]` from `0.04` → `0.06` (`cameraTarget[1]: 0.03`) for equal, balanced top/bottom margin between the clear lid and rounded base punt.
  - Slightly boost matte-satin sticker sheen (`envMapIntensity: 1.55, sheen: 0.42`) so rolling reflections shimmer smoothly as the can rotates.

---

## Study Pass 5 (`study-05.png` + `study-05-mid.png`) — Score: 97 / 100
- **Hero (`study-05.png`)**: Balanced vertical framing, razor-crisp colorless dark-field PET rims on luminous Orbs dark-mode studio depth, clear pull-tab lid, sculptural Orka teardrop headspace air pocket, crisp full-height matte-satin `BOCA` sticker, delicate sparkling micro-bubbles & chilled dewdrops, and thick domed base punt.
- **Mid-Scroll Macro (`study-05-mid.png`, scroll `0.33`)**: Verified dramatic 3D rotation with `coastal-drive` fluid scroll responsiveness, sparkling droplets & micro-carbonation inside the crystal-clear PET wall, and clean `0°/180°` `FrontSide` sticker rotation with zero rear bleed-through.
- **Verification**: `tsc --noEmit` = **0 errors**, `vite build` = **PASS**, `lint_donts.py website/src/scene` = **0 errors, 0 warnings**.

---

# Round 2 — 5-Point Macro Defect Study (Top Lid, Bottom Punt & Photoreal Bubbles)

## Defect Pass 1 (`defect-01.png` + `defect-01-top.png` + `defect-01-bottom.png`) — Score: 78 / 100
- **What improved**:
  - Removed the fake floating white torus rings (`PetBasePuntRing` & `ClearSeamHighlightRing`).
  - `@liquid-3d`'s air-in-water optical-lensing bubbles (visible in `defect-01-bottom.png`) look photographic with real dark lower-hemisphere refractive crescents + pinpoint upper specular glints!
  - `@lighting-3d`'s deeper obsidian backdrop with diagonal top-right → bottom-left studio shine looks dramatic and moody with zero drop shadows.
- **Brutal Macro Critique (Defects Exposed at 10× Magnification)**:
  1. **BOTTOM PUNT V-PINCH / SEAM SPLIT (`defect-01-bottom.png` & `defect-01.png`)**: A sharp vertical shading crease split the domed base punt into a half-white / half-black triangle right at the apex (caused by `LatheGeometry` seam discontinuity at `r = 0.0005` + `cos^1.45` profile slope).
  2. **TOP LID DECK WHITEOUT + RIM TEETH (`defect-01-top.png`)**: `clearLidMaterial` (`side: DoubleSide`, `envMapIntensity: 1.85`) + `lidRimMaterial` (`0.62`) blew out the flat clear lid deck to solid flat white (hiding the pull-tab) and caused jagged backface self-intersection teeth just under the front rim.
  3. **HERO TOP/BOTTOM CLIP (`defect-01.png`)**: At `bottleScale: 1.08, cameraPos.z: 4.18`, the very top of the lid and bottom of the heel slightly clipped the 800px viewport.
- **Fixes Applied for Defect Pass 2**:
  - `bottleGeometry.ts`: Replaced punt dome with an exact parabolic spherical cap (`y = 0.062 * (1 - t^2)^2`, `dy/dr = 0` at `r = 0`) and explicitly welded bottom pole normals (`r < 0.012`) to `(0, -1, 0)`.
  - `bottleGeometry.ts`: Switched `clearLidMaterial` to `side: THREE.FrontSide`, lowered `envMapIntensity: 0.72` / `clearcoat: 0.68`, toned `lidRimMaterial` (`pow(1 - ndv, 4.4) * 0.34`), and gave `ClearPullTab` a dedicated translucent clear acrylic material (`opacity: 0.52`, `roughness: 0.14`) for crisp 3D relief.
  - `scrollRig.ts` & `bottleWordmarkMesh.ts`: Pulled Beat 1 `cameraPos.z` to `4.46` (`bottleScale: 1.01`) and tuned `BOCA` (`arcHeightFraction: 0.80, yOffset: -0.05`).

---

## Defect Pass 2 (`defect-02.png` + `defect-02-top.png` + `defect-02-bottom.png`) — Score: 84 / 100
- **What improved**:
  - Hero framing (`defect-02.png`) is now 100% clean — full clear lid and full rounded base heel inside viewport with commanding right-side poise and generous margin from left text.
  - Clear pull-tab is now distinctly sculpted and legible inside the lid deck.
- **Brutal Macro Critique (Remaining Defects)**:
  1. **TOP MACRO (`defect-02-top.png`)**: `ClearLidShell` (`transmission: 0.90`) still creates jagged black/white vertical screen-space refraction teeth along the tight 90° countersink wall, and `ClearPullTab` (`opacity: 0.52`) reads slightly milky/frosted instead of crystal-clear acrylic.
  2. **BOTTOM MACRO (`defect-02-bottom.png`)**: Inner punt dome + `RefractiveWaterVolume` bottom pole still show a small heart/V-pinch at the apex and a half-white/half-black triangle in hero view.
- **Fixes Applied for Defect Pass 3**:
  - `bottleGeometry.ts`: Switched `clearLidMaterial` from screen-space `transmission` to pure optical crystal-clear acrylic (`opacity: 0.22, clearcoat: 1.0, envMapIntensity: 1.15`) so the 90° countersink fold has **zero refraction teeth** and zero chalk-white deck blow-out; made `clearPullTabMaterial` crystal-clear glossy (`opacity: 0.32, roughness: 0.075, clearcoat: 1.0`).
  - `bottleGeometry.ts`: Upgraded `buildInnerCanProfile` punt dome to 14-point parabolic spherical cap with welded `(0, 1, 0)` pole normals and added a smooth underside punt mask to `fresnelRimMaterial`.
  - Coordinated with `@liquid-3d` to weld `liquidGeo` bottom pole normals (`(0, -1, 0)`) and check `CapillaryMeniscusRing` inside the top macro.

---

## Defect Pass 3 (`defect-03.png` + `defect-03-top.png` + `defect-03-bottom.png`) — Score: 91 / 100
- **What improved**:
  - **TOP MACRO BREAKTHROUGH (`defect-03-top.png`)**: 100% elimination of jagged countersink refraction teeth AND 100% elimination of chalk-white lid deck blow-out! Clear lid, countersink, clear pull-tab, rivet, and Orka teardrop air pocket are silky-clean and architectural.
- **Brutal Macro Critique (Final 2 Micro-Defects)**:
  1. **BOTTOM PUNT POLAR NORMAL-MAP SINGULARITY (`defect-03-bottom.png`)**: Isolated the exact root cause of the tiny heart-dimple at `r = 0`: `petOuterMaterial`'s `bumpMap` and `clearcoatNormalMap` create a 360° UV tangent singularity at the center pole of `LatheGeometry`!
  2. **TOP LID RIM SPECULAR CRISP-UP (`defect-03.png`)**: Rolled clear lid rim looked slightly soft/matte gray at hero distance; needs sharper crystal specular catchlights on the rolled seam chime.
- **Fixes Applied for Defect Pass 4**:
  - `bottleGeometry.ts`: Split the smooth shallow injection-molded PET base punt (`buildBasePuntDomeProfile`, `0.044H` matching Orka photo #1) onto its own `petPuntMaterial` with **ZERO `bumpMap` and ZERO `clearcoatNormalMap`** (eliminating the polar UV tangent singularity permanently!).
  - `bottleGeometry.ts`: Upgraded `lidRimMaterial` shader with dual crisp studio specular highlights (`pow(spec, 36)` + `pow(1 - ndv, 3.6) * 0.68`) so the rolled crystal-clear seam chime gleams cleanly at hero and macro distances without any whiteout.






