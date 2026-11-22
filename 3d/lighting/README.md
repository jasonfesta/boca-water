# Boca Water — 3D Studio Lighting, PMREM Scrims & Shaded Backdrop

Architecture and rapid-tuning guide for the Boca Water crystal-clear PET bottle lighting rig (`website/src/scene/lighting.ts`) and Orb-inspired dark-mode atmospheric backdrop (`website/src/scene/backdrop.ts`).

---

## 1. Visual Philosophy & Color Discipline

- **Dark-Field / Bright-Rim Studio Photography for Crystal-Clear PET (12 fl oz / 355mL Sleek Can):** On a vertical cylinder viewed from `+Z`, an environment strip at azimuth $\phi$ reflects at screen fraction $x/R = \sin(\phi/2)$. Placing **razor-narrow high-radiance rear-side strip softboxes at ±144° and ±162°** locks the white specular outlines strictly to the outer 5% silhouette edges ($x/R \in [0.95, 0.99]$), while a continuous **pitch-black negative-fill curtain across `-115°..+115°`** keeps the center of the clear can crystal-clear dark so the luminous white vertical serif wordmark (`Boca` / `BOCA` / `boca`) pops with zero inner vertical reflection bars.
- **Pure Deep Obsidian Void:** Grounded in `#020203` pitch-black with whisper-subtle radial depth (`#0c1218`) and an optional dark glossy grazing floor reflection pool directly beneath the can—zero muddy gray haze, zero ambient washout.
- **Strict Zero-Purple Rule:** Every hue across both `lighting.ts` and `backdrop.ts` is locked to pure obsidian, crisp studio white, and cool glacial ice-silver (200°–212° hue). No purple, violet, or fuchsia tones appear anywhere in lights, scrims, or backdrop shaders.

---

## 2. Architecture Overview

### A. Procedural PMREM Studio Scrim Dome (`website/src/scene/lighting.ts`)

`buildStudioScrimEnvMap(renderer, envIntensityMultiplier)` synthesizes an HDR studio environment using `THREE.PMREMGenerator` with **`sigma = 0`** (Zero-Sigma Mip-0 Law) so sharp vertical softbox boundaries remain crisp across low-roughness PET clearcoat (`roughness: 0.042`, `clearcoatRoughness: 0.025`).

| Element | Azimuth / Position | Role |
| :--- | :--- | :--- |
| **Primary Key Silk-Scrim** | Left-Front (`-48°`) | Asymmetric feathered softbox (`crisp inner edge` + `Gaussian outer tail`, HDR `5.2`) drawing a tall liquid-white specular ribbon down the shoulder & side wall. |
| **Ice-White Edge-Kick Strip** | Right-Rear (`+126°`) | Narrow high-radiance strip (HDR `6.4`, `#d4ecff`) making the right silhouette edge and clear twist cap bevel pop against the dark backdrop. |
| **Counter-Edge Silver Rim** | Left-Rear (`-132°`) | Narrow silver-ice strip (HDR `4.4`, `#cde2f2`) guaranteeing crisp silhouette separation on both sides at every scroll rotation. |
| **Subtle Front-Right Fill** | Right-Front (`+56°`) | Soft cool-slate reflection (`2.4`) preventing dead spots on the opposite cylinder face. |
| **Overhead Crown Diffuser** | Front-Offset Zenith (`y = +8.0, z = +1.6`) | Soft rectangular diffuser (`3.6`) illuminating the short neck-in taper, clear seamed lid rim, clear pull-tab, and top air-pocket meniscus. |
| **Grazing Top-Seam Halo Strip** | High Rear-Right (`y = +5.4, z = -5.8`) | High-angle raking strip (`4.6`, `#dff1ff`) carving a crisp bright highlight along the annular seamed rim & pull-tab against obsidian. |
| **4× Negative-Fill Black-Velvet Flags** | Front, Back, Mid-Left, Mid-Right | Near-black (`#010203`) absorbers placed between scrims to carve dark refraction edges into the clear PET wall—preventing a milky or washed-out plastic look. |
| **5× Micro-Pinpoint Sparkle Glints** | Mid-Upper Hemisphere | Tiny high-radiance spheres (`8.8`) that ignite micro-glints on internal sparkling water bubbles and headspace meniscus as the sleek can spins. |
| **Under-Punt Bounce Strip & Floor** | Low Front (`y = -4.6`) & Nadir (`y = -7.2`) | Dedicated cool-silver upward bounce (`2.35`, `#cfe6f7`) + slate floor that illuminates the thick domed clear PET base punt & rounded heel. |

> **Renderer State Hygiene:** `buildStudioScrimEnvMap` saves and restores `renderTarget`, `viewport`, `scissor`, and `scissorTest` immediately after `pmrem.fromScene(envScene, 0)` and disposes all temporary geometries, materials, and the `PMREMGenerator`.

### B. Dynamic Physical Scene Lights (`createLightingRig`)

In addition to `envMap`, six physical lights in `rig.group` animate smoothly with `ScrollState` (`progress`, `velocity`, `section`, `pointerX`, `pointerY`):

1. **`StudioKeyLight` (`DirectionalLight`)** — Sweeps gently with scroll & pointer to keep specular highlights gliding along the spinning PET wall and vertical `"Boca"` serif wordmark.
2. **`StudioRimRight` & `StudioRimLeft` (`DirectionalLight`)** — Counter-orbiting grazing rim lights that ramp up during the `'silhouette'` chapter.
3. **`SparklingCausticLight` (`PointLight`)** — Orbits close to the interior water column, boosting intensity during `'bubbles'` and reacting to `scroll.velocity` for lively carbonation shimmer.
4. **`ClearCapSpotLight` (`SpotLight`)** — Narrow overhead accent spotlight that ramps up (`1.65×`) during `'cap'` to reveal clear PET cap ridges and tamper-evident ring geometry.
5. **`StudioHemiFill` (`HemisphereLight`)** — Very restrained (`0.16–0.30`) cool-slate sky / obsidian ground fill to keep the vertical wordmark legible without crushing dark-studio contrast.

### C. Opaque Far-Plane Shaded Backdrop (`website/src/scene/backdrop.ts`)

`createBackdrop(options, tuneOverrides)` renders a custom GLSL shader onto a far-plane NDC quad (`gl_Position = vec4(position.xy, 0.9999, 1.0)`) with `transparent: false`, `depthWrite: false`, and `renderOrder: -1000`.

Why opaque far-plane NDC?
1. **Physical PET Transmission:** Because `transparent: false`, Three.js includes the backdrop in its internal `transmissionRenderTarget` pass, so the crystal-clear PET bottle and sparkling water physically refract the Orb-inspired cool halo and vertical spine lift.
2. **Zero Clipping & Aspect Safety:** Never clips regardless of camera scroll choreography, FOV changes, or mobile (`390px`) vs. desktop (`1280px`) viewports.
3. **Zero Dark-Mode Banding:** Applies screen-space triangular-PDF dithering (`±1/255`) before output.

---

## 3. Presets & Tuning Knobs

### Lighting Presets (`LightingPreset`)

| Preset | Mood | Best For |
| :--- | :--- | :--- |
| `'studio-dark'` *(default)* | Balanced luxury dark studio, crisp white key + cool ice rim | Hero landing, general scroll showcase |
| `'ice-rim'` | Chilled glacial-ice rim boost + stronger bubble caustic sparkle | Close-up carbonation & chilled beverage emphasis |
| `'dramatic-edge'` | High-contrast chiaroscuro, deeper negative fill, razor rim edges | Editorial silhouette & luxury lookbook shots |

### Rapid Multi-Pass Render-Comparison Tuning Guide

When tuning against user comparison renders, adjust these exact knobs:

| Visual Goal | File & Symbol | Adjustment |
| :--- | :--- | :--- |
| **Stronger clear PET silhouette pop** | `lighting.ts` → `LIGHTING_PRESETS[preset].rimRightIntensity` / `rimLeftIntensity` | Increase by `+0.4` to `+0.8`, or increase Edge-Kick Strip radiance (`6.4` → `7.5`). |
| **Sharper / narrower vertical specular ribbon** | `lighting.ts` → `buildStudioScrimEnvMap` (Key Silk-Scrim) | Narrow `PlaneGeometry(2.6, 12.0)` width to `1.8` and tighten Gaussian exponent (`2.15` → `2.8`). |
| **More dark contrast inside clear plastic** | `lighting.ts` → `flagPositions` / `hemiIntensity` | Widen negative-fill flags (`3.2` → `4.2`) and lower `hemiIntensity` (`0.28` → `0.18`). |
| **More sparkling bubble glints** | `lighting.ts` → `causticIntensity` & `glintMat` scalar | Raise `causticIntensity` (`2.1` → `3.0`) or `glintMat` scalar (`8.5` → `11.0`). |
| **Clearer PET cap ridges** | `lighting.ts` → `capSpotIntensity` / `CHAPTER_LIGHT_MODS.cap.capSpotMul` | Raise `capSpotIntensity` (`2.2` → `3.2`). |
| **Brighter / darker Orb backdrop halo** | `backdrop.ts` → `BackdropOptions.intensity` or `DEFAULT_BACKDROP_TUNE_PARAMS.haloColor` | Tune `intensity` (`0.75` for moodier obsidian, `1.25` for more studio separation). |
| **Refracted spine highlight behind bottle** | `backdrop.ts` → `CHAPTER_TARGETS[section].iceLift` | Increase `iceLift` (`0.22` → `0.35`) to brighten the refracted core through the water. |
