import type {
  SonicConfig,
  SelectorInput,
  PluckOptions,
  ContinuousOptions,
  ArpeggioOptions,
  HoverSoundOptions,
  ChordPadOptions,
  DroneOptions,
  DroneSectionZone,
  AccessibilityConfig,
  SonicEventName,
  SonicEventCallback,
  RomanNumeral,
  ModulationType
} from './types';

import { HarmonyManager } from './core/harmony';
import { SynthEngine } from './core/synth-engine';
import { Tracker } from './core/tracker';

import { PluckBehavior } from './behaviors/pluck';
import { ContinuousBehavior } from './behaviors/continuous';
import { ArpeggioBehavior } from './behaviors/arpeggio';
import { HoverSoundBehavior } from './behaviors/hover-sound';
import { ChordPadBehavior } from './behaviors/chord-pad';
import { DroneBehavior } from './behaviors/drone';

import { voices } from './voices';
import { getPreset, listPresets } from './presets';

// ============================================================================
// Event Emitter
// ============================================================================

class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, callback: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

// ============================================================================
// SonicUX Class
// ============================================================================

export class SonicUX {
  private harmony: HarmonyManager;
  private synthEngine: SynthEngine;
  private tracker: Tracker;
  private events: EventEmitter;

  // Behaviors
  private pluckBehavior: PluckBehavior;
  private continuousBehavior: ContinuousBehavior;
  private arpeggioBehavior: ArpeggioBehavior;
  private hoverSoundBehavior: HoverSoundBehavior;
  private chordPadBehavior: ChordPadBehavior;
  private droneBehavior: DroneBehavior;

  // State
  private isEnabled = true;
  private currentPreset: string;
  private accessibilityConfig: AccessibilityConfig = {
    reducedMotion: 'auto',
    allowSound: true
  };

  private constructor(config: SonicConfig) {
    // Initialize core systems
    this.harmony = new HarmonyManager(config.key, config.mode);
    this.synthEngine = new SynthEngine({
      polyphony: config.polyphony ?? 16,
      masterVolume: config.masterVolume ?? -12,
      reverbWet: 0.2,
      reverbDecay: 2.5
    });
    this.tracker = new Tracker();
    this.events = new EventEmitter();

    // Initialize behaviors
    this.pluckBehavior = new PluckBehavior(this.harmony, this.synthEngine, this.tracker);
    this.continuousBehavior = new ContinuousBehavior(this.harmony, this.synthEngine, this.tracker);
    this.arpeggioBehavior = new ArpeggioBehavior(this.harmony, this.synthEngine, this.tracker);
    this.hoverSoundBehavior = new HoverSoundBehavior(this.harmony, this.synthEngine, this.tracker);
    this.chordPadBehavior = new ChordPadBehavior(this.harmony, this.synthEngine, this.tracker);
    this.droneBehavior = new DroneBehavior(this.harmony, this.synthEngine, this.tracker);

    // Apply preset
    this.currentPreset = config.preset ?? 'ambient';
    this.applyPreset(this.currentPreset);

    // Setup synth engine event forwarding
    this.synthEngine.onNotePlay((note) => {
      this.events.emit('notePlay', note);
    });

    // Check for reduced motion
    this.detectReducedMotion();
  }

  // ============================================================================
  // Factory Method
  // ============================================================================

  static async create(config: SonicConfig = {}): Promise<SonicUX> {
    const instance = new SonicUX(config);

    // Initialize synth engine (but don't start audio yet)
    await instance.synthEngine.init();

    // Register all voices
    Object.entries(voices).forEach(([name, definition]) => {
      instance.synthEngine.registerVoice(name, definition);
    });

    return instance;
  }

  // ============================================================================
  // Behavior Methods
  // ============================================================================

  pluck(selector: SelectorInput, options?: PluckOptions): void {
    if (!this.isEnabled) return;
    this.pluckBehavior.attach(selector, options);
  }

  continuous(selector: SelectorInput, options?: ContinuousOptions): void {
    if (!this.isEnabled) return;
    if (this.accessibilityConfig.reducedMotion === 'force') return;
    this.continuousBehavior.attach(selector, options);
  }

  arpeggio(selector: SelectorInput, options?: ArpeggioOptions): void {
    if (!this.isEnabled) return;
    this.arpeggioBehavior.attach(selector, options);
  }

  hoverSound(selector: SelectorInput, options?: HoverSoundOptions): void {
    if (!this.isEnabled) return;
    this.hoverSoundBehavior.attach(selector, options);
  }

  chordPad(selector: SelectorInput, options?: ChordPadOptions): void {
    if (!this.isEnabled) return;
    this.chordPadBehavior.attach(selector, options);
  }

  // Drone is a special global behavior
  drone = {
    start: (options?: DroneOptions) => {
      if (!this.isEnabled) return;
      this.droneBehavior.start(options);
    },
    stop: () => {
      this.droneBehavior.stop();
    },
    sections: (zones: DroneSectionZone[]) => {
      this.droneBehavior.setupSections(zones);
    }
  };

  // ============================================================================
  // Harmony Control
  // ============================================================================

  setKey(key: string, mode: string): void {
    this.harmony.setKey(key, mode);
    this.events.emit('keyChange', { key, mode });
  }

  modulate(type: ModulationType): void {
    this.harmony.modulate(type);
    const state = this.harmony.getState();
    this.events.emit('keyChange', { key: state.key, mode: state.mode });
  }

  setScale(intervals: number[]): void {
    this.harmony.setScale(intervals);
  }

  setChord(notes: number[]): void {
    this.harmony.setChord(notes);
    this.events.emit('chordChange', notes);
  }

  lockHarmony(): void {
    this.harmony.lockHarmony();
  }

  unlockHarmony(): void {
    this.harmony.unlockHarmony();
  }

  setChordPool(chords: RomanNumeral[]): void {
    this.harmony.setChordPool(chords);
  }

  // ============================================================================
  // Global Controls
  // ============================================================================

  async unlock(): Promise<void> {
    await this.synthEngine.unlock();
    this.events.emit('audioUnlock', undefined);
  }

  setVolume(db: number): void {
    this.synthEngine.setVolume(db);
  }

  mute(): void {
    this.synthEngine.mute();
  }

  unmute(): void {
    this.synthEngine.unmute();
  }

  enable(): void {
    this.isEnabled = true;
    this.unmute();
  }

  disable(): void {
    this.isEnabled = false;
    this.mute();
  }

  destroy(): void {
    // Cleanup all behaviors
    this.pluckBehavior.cleanup();
    this.continuousBehavior.cleanup();
    this.arpeggioBehavior.cleanup();
    this.hoverSoundBehavior.cleanup();
    this.chordPadBehavior.cleanup();
    this.droneBehavior.cleanup();

    // Cleanup core systems
    this.tracker.cleanup();
    this.synthEngine.destroy();
  }

  // ============================================================================
  // Preset System
  // ============================================================================

  setPreset(name: string): void {
    this.currentPreset = name;
    this.applyPreset(name);
    this.events.emit('presetChange', name);
  }

  private applyPreset(name: string): void {
    const preset = getPreset(name);

    // Apply synth engine settings
    this.synthEngine.updateConfig({
      reverbWet: preset.reverbWet,
      reverbDecay: preset.reverbDecay,
      masterVolume: preset.masterVolume
    });
  }

  static presets(): string[] {
    return listPresets();
  }

  // ============================================================================
  // Accessibility
  // ============================================================================

  setAccessibility(config: AccessibilityConfig): void {
    this.accessibilityConfig = { ...this.accessibilityConfig, ...config };

    if (config.allowSound === false) {
      this.disable();
    } else if (config.allowSound === true) {
      this.enable();
    }
  }

  private detectReducedMotion(): void {
    if (this.accessibilityConfig.reducedMotion === 'auto' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        this.accessibilityConfig.reducedMotion = 'force';
      }

      // Listen for changes
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.accessibilityConfig.reducedMotion = 'force';
        } else {
          this.accessibilityConfig.reducedMotion = 'off';
        }
      });
    }
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<K extends SonicEventName>(event: K, callback: SonicEventCallback<K>): void {
    this.events.on(event, callback);
  }

  off<K extends SonicEventName>(event: K, callback: SonicEventCallback<K>): void {
    this.events.off(event, callback);
  }

  // ============================================================================
  // Debug Mode
  // ============================================================================

  debug(enabled: boolean): void {
    if (enabled) {
      // TODO: Initialize debug overlay
      console.log('Debug mode enabled');
      console.log('Harmony state:', this.harmony.getState());
      console.log('Active voices:', this.synthEngine.getActiveVoiceCount());
      console.log('Current preset:', this.currentPreset);
    }
  }
}

// ============================================================================
// Export
// ============================================================================

export default SonicUX;

// Export types for consumers
export type {
  SonicConfig,
  PluckOptions,
  ContinuousOptions,
  ArpeggioOptions,
  HoverSoundOptions,
  ChordPadOptions,
  DroneOptions,
  DroneSectionZone,
  AccessibilityConfig
};
