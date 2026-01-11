/**
 * SonicUX TypeScript Type Definitions
 *
 * These types describe the JavaScript API for the SonicUX musicalization engine.
 */

/**
 * Continuous input sent at a fixed cadence from the host application.
 * All position values are normalized to 0..1 range.
 */
export interface InteractionFrame {
  /** Timestamp in milliseconds */
  tMs: number;

  /** Viewport width in pixels */
  viewportW: number;
  /** Viewport height in pixels */
  viewportH: number;

  /** Pointer X position (0..1), or -1 for "no pointer active" */
  pointerX: number;
  /** Pointer Y position (0..1), or -1 for "no pointer active" */
  pointerY: number;
  /** Pointer speed (0..1) */
  pointerSpeed: number;

  /** Scroll Y position (0..1) */
  scrollY: number;
  /** Scroll velocity (-1..1) */
  scrollV: number;

  /** Opaque hover element ID (0 = no element) */
  hoverId: number;
  /** Current section/route index */
  sectionId: number;

  /** Window has focus (0 or 1) */
  focus: 0 | 1;
  /** Browser tab is visible (0 or 1) */
  tabFocused: 0 | 1;
  /** User prefers reduced motion (0 or 1) */
  reducedMotion: 0 | 1;
}

/**
 * Discrete input event sent immediately on occurrence.
 */
export type InteractionEvent =
  | {
      type: "click";
      x: number;
      y: number;
      targetId: number;
      weight?: number;
    }
  | {
      type: "nav";
      sectionId: number;
      weight?: number;
    }
  | {
      type: "hoverStart";
      hoverId: number;
      weight?: number;
    }
  | {
      type: "hoverEnd";
      hoverId: number;
      weight?: number;
    };

/**
 * Output from the engine containing continuous params and discrete events.
 */
export interface OutputFrame {
  /** Smoothed continuous musical parameters */
  params: MusicParams;
  /** Current harmonic state */
  harmony: HarmonyState;
  /** Discrete musical events triggered this frame */
  events: MusicEvent[];
  /** Optional diagnostic output (if enabled) */
  diagnostics?: Diagnostics;
}

/**
 * Continuous musical parameters (all 0..1).
 */
export interface MusicParams {
  /** Overall intensity / master level */
  master: number;
  /** Harmonic richness / tonal warmth */
  warmth: number;
  /** Filter cutoff proxy (higher = brighter) */
  brightness: number;
  /** Stereo spread / width */
  width: number;
  /** Modulation depth / movement amount */
  motion: number;
  /** Spatial depth / reverb send */
  reverb: number;
  /** Voice or note activity level */
  density: number;
  /** Harmonic complexity / tension level */
  tension: number;
}

/**
 * Current harmonic state.
 */
export interface HarmonyState {
  /** Root note (0-11, where 0 = C) */
  root: number;
  /** Current mode name */
  mode: Mode;
  /** Harmonic tension level (0..1) */
  tension: number;
}

/**
 * Supported musical modes.
 */
export type Mode =
  | "major"
  | "minor"
  | "dorian"
  | "mixolydian"
  | "lydian"
  | "phrygian"
  | "pentatonic_major"
  | "pentatonic_minor";

/**
 * Discrete musical events.
 * All events include a salience field (0..1) indicating importance.
 */
export type MusicEvent =
  | {
      type: "pluck";
      /** MIDI note number */
      note: number;
      /** Velocity (0..1) */
      vel: number;
      /** Importance (0..1) */
      salience: number;
    }
  | {
      type: "padChord";
      /** Array of MIDI note numbers */
      notes: number[];
      /** Velocity (0..1) */
      vel: number;
      /** Importance (0..1) */
      salience: number;
    }
  | {
      type: "cadence";
      /** Target key (0-11) */
      toKey: number;
      /** Target mode */
      mode: Mode;
      /** Importance (0..1) */
      salience: number;
    }
  | {
      type: "accent";
      /** Accent strength (0..1) */
      strength: number;
      /** Importance (0..1) */
      salience: number;
    }
  | {
      type: "mute";
      /** Mute on/off */
      on: boolean;
      /** Importance (0..1) */
      salience: number;
    };

/**
 * Diagnostic output for debugging and visualization.
 */
export interface Diagnostics {
  /** Current key (0-11, where 0 = C) */
  key: number;
  /** Current mode as numeric value */
  mode: number;
  /** Current chord degree (0-6 for I-VII) */
  chord: number;
  /** Raw (unsmoothed) activity value */
  rawActivity: number;
  /** Current smoothing attack coefficient */
  smoothingAttack: number;
  /** Current smoothing release coefficient */
  smoothingRelease: number;
  /** Time since last event (ms) */
  timeSinceEvent: number;
}

/**
 * Available harmony presets.
 */
export type Preset = "ambient" | "minimal" | "dramatic" | "playful";

/**
 * Chord degrees in Roman numeral notation.
 */
export type ChordDegree = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII";

/**
 * The main SonicUX engine class.
 */
export declare class SonicEngine {
  /**
   * Create a new engine with the given seed and preset.
   * @param seed - RNG seed for deterministic behavior
   * @param preset - Optional harmony preset name
   */
  constructor(seed: bigint, preset?: Preset);

  /**
   * Process an interaction frame and return musical output.
   * @param frame - Current interaction state
   * @returns Musical output frame
   */
  update(frame: InteractionFrame): OutputFrame;

  /**
   * Process a discrete interaction event.
   * @param event - The interaction event
   * @returns Array of triggered music events
   */
  event(event: InteractionEvent): MusicEvent[];

  /**
   * Set the current section/route.
   * @param sectionId - Section identifier
   */
  set_section(sectionId: number): void;

  /**
   * Enable or disable the engine.
   * @param enabled - Whether the engine should be active
   */
  set_enabled(enabled: boolean): void;

  /**
   * Enable or disable diagnostic output.
   * @param enabled - Whether to include diagnostics in output
   */
  set_diagnostics(enabled: boolean): void;

  /**
   * Set harmony preset by name.
   * @param name - Preset name
   */
  set_preset(name: Preset): void;

  /**
   * Set scale by root note name and mode.
   * @param root - Note name (e.g., "C", "A#", "Bb")
   * @param mode - Mode name
   */
  set_scale(root: string, mode: Mode): void;

  /**
   * Set the available chord pool.
   * @param chords - Array of chord degrees
   */
  set_chord_pool(chords: ChordDegree[]): void;

  /**
   * Set modulation rate.
   * @param rate - Rate from 0 to 1 (higher = more frequent key changes)
   */
  set_modulation_rate(rate: number): void;
}
