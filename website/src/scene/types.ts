import type * as THREE from 'three';

/**
 * Narrative scroll chapters for the Boca Water 3D stage.
 * Scroll progress 0.0 -> 1.0 transitions smoothly across these beats.
 */
export type BottleScrollSection =
  | 'hero'
  | 'silhouette'
  | 'bubbles'
  | 'cap'
  | 'pack';

/**
 * Case options for the vertical serif wordmark running UP along the side of the can.
 */
export type WordmarkCase = 'title' | 'upper' | 'lower';

/**
 * Interactive 3D pack formation modes for the Shop / Pack Showcase stage.
 */
export type PackMode = '1-pack' | '6-pack' | '24-pack';

/**
 * All 6 interactive 3D Shop catalog items (Row 1 water trio + Row 2 apparel trio).
 */
export type ShopItemId = PackMode | 'shirt' | 'hat' | 'hoodie';

/**
 * Interactive 3D macro hotspot IDs on Science Stop 2 (storyScrollProgress = 0.5).
 */
export type ScienceHotspotId = 'lid' | 'formula' | 'vessel' | 'punt';

export interface HotspotScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export type ScienceHotspotPositions = Record<ScienceHotspotId, HotspotScreenPoint>;

/**
 * Active top-level page view driving 3D stage enter/exit choreography.
 * ('about' and 'science' are supported alongside 'story' for clean compatibility.)
 */
export type SceneViewMode = 'home' | 'shop' | 'story' | 'science' | 'about' | 'design';

/**
 * Active studio lighting & backdrop theme (starts in 'dark' by default).
 */
export type SceneTheme = 'dark' | 'light';

/**
 * Real-time scroll + pointer state shared across the vessel rig,
 * lighting studio scrims, and atmospheric backdrop.
 */
export interface ScrollState {
  /** Damped 0..1 page scroll progress */
  progress: number;
  /** Unsmoothed 0..1 page scroll progress */
  rawProgress: number;
  /** Signed scroll velocity (units/sec, damped) */
  velocity: number;
  /** Active narrative chapter */
  section: BottleScrollSection;
  /** 0..1 progress within the active chapter */
  sectionProgress: number;
  /** Normalized pointer X (-1..1) */
  pointerX: number;
  /** Normalized pointer Y (-1..1) */
  pointerY: number;
  /** Active 3D pack mode (optional for lighting/backdrop consumers) */
  packMode?: PackMode;
  /** Whether the 6-pack or 24-pack is currently puffed/unraveled outward in 3D */
  packExpanded?: boolean;
  /** Active theme ('dark' | 'light') */
  theme?: SceneTheme;
  /** Smoothly damped 1 (dark) -> 0 (light) blend factor (Orbs 3D pattern) */
  darkMix?: number;
}

export type LightingPreset = 'studio-dark' | 'ice-rim' | 'dramatic-edge';

export interface LightingOptions {
  preset?: LightingPreset;
  envIntensity?: number;
  keyIntensity?: number;
  rimIntensity?: number;
}

/**
 * Contract returned by website/src/scene/lighting.ts (`createLightingRig`).
 * Owned by @lighting-3d, consumed by BottleScene.tsx.
 */
export interface BottleLightingRig {
  /** Light objects group added to the scene */
  group: THREE.Group;
  /** PMREM studio scrim environment map assigned to scene.environment */
  envMap: THREE.Texture;
  /** Per-frame update to sweep studio scrim highlights as the vessel spins */
  update: (time: number, scroll: ScrollState, theme?: SceneTheme) => void;
  /** Optional runtime preset switch */
  setPreset?: (preset: LightingPreset) => void;
  /** Optional runtime Dark / Light theme switch */
  setTheme?: (theme: SceneTheme) => void;
  /** Clean GPU disposal */
  dispose: () => void;
}

export interface BackdropOptions {
  /** Subtle dark Orb-inspired shaded aesthetic (no purple hues) */
  intensity?: number;
  /** Optional WebGLRenderer for 256x256 ping-pong FBO shallow-water ripple PDE simulation */
  renderer?: THREE.WebGLRenderer;
  /** Initial studio theme ('dark' | 'light') */
  theme?: SceneTheme;
}

/**
 * Contract returned by website/src/scene/backdrop.ts (`createBackdrop`).
 * Owned by @lighting-3d, consumed by BottleScene.tsx.
 */
export interface BackdropHandle {
  /** Background mesh / dome / shaded orb plane added to the scene */
  mesh: THREE.Object3D;
  /** Per-frame update for subtle parallax and atmospheric light shift */
  update: (
    time: number,
    scroll: ScrollState,
    viewport: { width: number; height: number },
    theme?: SceneTheme
  ) => void;
  /** Optional runtime Dark / Light theme switch */
  setTheme?: (theme: SceneTheme) => void;
  /** Clean GPU disposal */
  dispose: () => void;
}

/**
 * Tunable physical & geometric parameters for the sleek 12 fl oz (355mL)
 * crystal-clear PET beverage can. Centralized for rapid multi-pass visual
 * comparison against reference renders.
 */
export interface BottleTuneParams {
  // Silhouette (sleek 12 fl oz / 355mL clear PET can: ~2.65:1 height-to-diameter)
  bottleHeight: number;
  bodyRadius: number;
  neckRadius: number;
  capRadius: number;
  wallThickness: number;

  // Crystal-clear PET plastic material (NOT glass)
  petIor: number;
  petTransmission: number;
  petThickness: number;
  petRoughness: number;
  petClearcoat: number;
  petClearcoatRoughness: number;
  petSpecularIntensity: number;
  petEnvMapIntensity: number;
  petAttenuationDistance: number;
  petAttenuationColor: string;

  // Crystal-clear PET / acrylic seamed lid & pull-tab top
  capIor: number;
  capTransmission: number;
  capRoughness: number;
  capClearcoat: number;

  // Interior sparkling water + top headspace air pocket + micro-bubbles
  waterFillLevel: number;
  waterIor: number;
  waterTransmission: number;
  risingBubbleCount: number;
  wallBubbleCount: number;
  bubbleRiseSpeed: number;

  // Vertical serif "Boca" / "BOCA" / "boca" wordmark running UP along the side
  wordmarkOpacity: number;
  wordmarkColor: string;
  wordmarkScale: number;
  wordmarkRoughness: number;
}

export const DEFAULT_BOTTLE_TUNE_PARAMS: BottleTuneParams = {
  // Sleek 12 fl oz (355mL) clear PET can proportions (height 2.28 / dia 0.86 = 2.65:1)
  bottleHeight: 2.28,
  bodyRadius: 0.43,
  neckRadius: 0.382,
  capRadius: 0.398,
  wallThickness: 0.018,

  // PET refractive index ~1.57 (crisp clear plastic specular, zero green glass tint)
  petIor: 1.57,
  petTransmission: 0.965,
  petThickness: 0.14,
  petRoughness: 0.048,
  petClearcoat: 1.0,
  petClearcoatRoughness: 0.028,
  petSpecularIntensity: 1.28,
  petEnvMapIntensity: 1.5,
  petAttenuationDistance: 4.8,
  petAttenuationColor: '#f1f8fd',

  // Completely clear PET / acrylic can lid, seam rim & pull-tab
  capIor: 1.57,
  capTransmission: 0.92,
  capRoughness: 0.068,
  capClearcoat: 0.96,

  // Sparkling water filling high into the sleek can with visible headspace air pocket
  waterFillLevel: 0.922,
  waterIor: 1.333,
  waterTransmission: 0.95,
  risingBubbleCount: 340,
  wallBubbleCount: 260,
  bubbleRiseSpeed: 1.0,

  // Vertical serif print along side of can
  wordmarkOpacity: 0.95,
  wordmarkColor: '#f6fafe',
  wordmarkScale: 1.0,
  wordmarkRoughness: 0.22,
};

/**
 * Props for the main <BottleScene /> React component.
 */
export interface BottleSceneProps {
  /** Optional external 0..1 scroll progress. If omitted, tracks window scroll automatically. */
  scrollProgress?: number;
  /** Optional mutable ref for zero-React-rerender 60fps scroll progress (takes precedence over scrollProgress when provided) */
  scrollProgressRef?: { readonly current: number };
  /** Optional callback whenever the active scroll chapter updates */
  onSectionChange?: (section: BottleScrollSection, progress: number) => void;
  /** Serif font family for the vertical wordmark on the can */
  fontFamily?: string;
  /** Case for the vertical wordmark: 'title' ("Boca"), 'upper' ("BOCA"), 'lower' ("boca") */
  textCase?: WordmarkCase;
  /** Optional pre-rendered canvas for the vertical wordmark (from @fonts) */
  wordmarkCanvas?: HTMLCanvasElement | null;
  /** Optional factory function to render the vertical wordmark for a given font family & case */
  renderWordmarkCanvas?: (
    fontFamily: string,
    textCase?: WordmarkCase
  ) => HTMLCanvasElement;
  /** Optional two-sided factory rendering front ('BOCA') & back ('WATER') vertical canvases */
  renderWordmarkSideCanvas?: (
    side: 'front' | 'back',
    fontFamily?: string,
    existingCanvas?: HTMLCanvasElement,
    color?: string
  ) => HTMLCanvasElement;
  /** Studio lighting preset */
  lightingPreset?: LightingPreset;
  /** Studio theme: 'dark' (default) or 'light' (Orbs warm gallery white) */
  theme?: SceneTheme;
  /** Toggle hot-stamped 24k reflective metallic gold foil bottle wordmark (default: false) */
  goldWordmark?: boolean;
  /** Active page view: 'home' (4-beat scroll), 'shop' (3-column 3D trio), 'story' (vertical turning can on scroll) */
  viewMode?: SceneViewMode;
  /** Normalized 0..1 scroll progress inside the Story/Science view (drives vertical can rise & bidirectional 360-deg spin) */
  storyScrollProgress?: number;
  /** Optional mutable ref for zero-React-rerender Science/Story scroll progress */
  storyScrollProgressRef?: { readonly current: number };
  /** Normalized 0..1 vertical scroll progress inside mobile Shop (< 768px) to align Single / Six-Pack / Case 3D formations */
  shopScrollProgress?: number;
  /** Optional mutable ref for zero-React-rerender mobile Shop scroll progress */
  shopScrollProgressRef?: { readonly current: number };
  /** When true, smoothly glides directly from current pose (e.g. Beat 4) to Beat 1 in one calm S-curve arc without passing through Beat 3/2 */
  directReturn?: boolean;
  /** Interactive 3D pack formation ('1-pack' solo, '6-pack' 2x3, '24-pack' 4x6) */
  packMode?: PackMode;
  /** Currently hovered Shop item (Row 1 water packs or Row 2 apparel) for 3D hover lift & turn */
  hoveredPack?: ShopItemId | null;
  /** When true, 6-pack / 24-pack puffs and unravels outward in 3D space with spring physics */
  packExpanded?: boolean;
  /** Callback when the user taps/clicks the 3D can or pack (distinguished from drag-to-spin) */
  onCanTap?: () => void;
  /** Callback fired as the centered opening bottle finishes filling (~1.25s) and glides into Beat 1 Hero */
  onIntroComplete?: () => void;
  /** Active Science Stop 2 hotspot for smooth 3D macro camera zoom (null = full centered bottle) */
  activeHotspot?: ScienceHotspotId | null;
  /** Mutable ref updated per-frame with 3D-projected screen pixel coordinates of the 4 Science hotspots (0 React re-renders) */
  hotspotPositionsRef?: { current: ScienceHotspotPositions };
  /** Optional callback receiving projected Science hotspot screen coordinates */
  onHotspotPositions?: (positions: ScienceHotspotPositions) => void;
  /** Enable subtle pointer spring oscillation and drag-to-spin inspection (default: true) */
  interactive?: boolean;
  /** Optional parameter overrides for render-comparison tuning passes */
  tuneParams?: Partial<BottleTuneParams>;
  /** Additional CSS class on the canvas container */
  className?: string;
}

/**
 * Pose keyframe for the scroll-driven vessel & camera choreography.
 */
export interface ScrollKeyframe {
  /** 0..1 scroll position */
  at: number;
  section: BottleScrollSection;
  /** Vessel world position */
  bottlePos: [number, number, number];
  /** Vessel Euler rotation in radians [pitch X, yaw Y, roll Z] */
  bottleRot: [number, number, number];
  /** Vessel uniform scale */
  bottleScale: number;
  /** Camera position */
  cameraPos: [number, number, number];
  /** Camera lookAt target */
  cameraTarget: [number, number, number];
  /** Camera vertical FOV in degrees */
  cameraFov: number;
}
