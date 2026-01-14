import type * as Tone from 'tone';

// ============================================================================
// Configuration Types
// ============================================================================

export interface SonicConfig {
  key?: string;
  mode?: string;
  preset?: string;
  masterVolume?: number;
  polyphony?: number;
}

export interface AccessibilityConfig {
  reducedMotion?: 'auto' | 'force' | 'off';
  allowSound?: boolean;
}

// ============================================================================
// Harmony Types
// ============================================================================

export interface HarmonyState {
  key: string;
  mode: string;
  scale: number[];
  chord: number[];
  isLocked: boolean;
}

export type ModulationType = 'relative' | 'dominant' | 'subdominant';

export type RomanNumeral = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' |
                           'i' | 'ii' | 'iii' | 'iv' | 'v' | 'vi' | 'vii' |
                           'vii°' | 'viio';

export interface ModeDefinition {
  intervals: number[];
}

// ============================================================================
// Musical Types
// ============================================================================

export interface NoteEvent {
  note: number;
  velocity: number;
  duration?: string | number;
  voice?: string;
  timestamp?: number;
}

export type SelectorInput = string | Element | NodeList | HTMLElement[];

// ============================================================================
// Behavior Types
// ============================================================================

export interface PluckOptions {
  voice?: string;
  velocity?: number;
  noteSelection?: 'random' | 'sequential' | 'position';
  octave?: number;
  onNote?: (note: number) => void;
}

export interface ContinuousOptions {
  xAxis?: 'pitch';
  yAxis?: 'waveform' | 'filter';
  portamento?: number;
  voice?: string;
  octave?: number;
}

export interface ArpeggioOptions {
  pattern?: 'up' | 'down' | 'upDown' | 'random';
  speed?: string;
  notes?: number[];
  voice?: string;
  octave?: number;
}

export interface HoverSoundOptions {
  enter?: string | number;
  exit?: string | number;
  voice?: string;
}

export interface ChordPadOptions {
  chord?: RomanNumeral | number[];
  voice?: string;
  fadeIn?: number;
  fadeOut?: number;
  volume?: number;
}

export interface DroneOptions {
  chord?: RomanNumeral;
  voices?: number;
  mousePosition?: boolean;
  mouseVelocity?: number;
  volume?: number;
}

export interface DroneSectionZone {
  selector: string;
  chord: RomanNumeral;
}

// ============================================================================
// Synth Engine Types
// ============================================================================

export interface VoiceDefinition {
  create: () => any;
  settings?: any;
}

export interface ActiveVoice {
  id: string;
  synth: any;
  startTime: number;
  note: number;
  velocity: number;
}

export interface SynthEngineConfig {
  polyphony: number;
  masterVolume: number;
  reverbWet: number;
  reverbDecay: number;
}

// ============================================================================
// Preset Types
// ============================================================================

export interface PresetPack {
  name: string;
  voices: {
    [key: string]: string;
  };
  reverbWet: number;
  reverbDecay: number;
  masterVolume: number;
  defaultVelocity: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type SonicEventMap = {
  notePlay: NoteEvent;
  chordChange: number[];
  sectionChange: string;
  audioUnlock: void;
  presetChange: string;
  keyChange: { key: string; mode: string };
};

export type SonicEventName = keyof SonicEventMap;

export type SonicEventCallback<K extends SonicEventName> = (data: SonicEventMap[K]) => void;

// ============================================================================
// Tracker Types
// ============================================================================

export interface PointerHandlers {
  onDown?: (event: PointerEvent, element: HTMLElement) => void;
  onMove?: (event: PointerEvent, element: HTMLElement) => void;
  onUp?: (event: PointerEvent, element: HTMLElement) => void;
}

export interface HoverHandlers {
  onEnter?: (event: MouseEvent, element: HTMLElement) => void;
  onLeave?: (event: MouseEvent, element: HTMLElement) => void;
}

// ============================================================================
// Debug Types
// ============================================================================

export interface DebugInfo {
  harmony: HarmonyState;
  activeVoices: number;
  recentNotes: NoteEvent[];
  activeBehaviors: {
    name: string;
    elementCount: number;
  }[];
}
