import type { SelectorInput, HoverSoundOptions } from '../types';
import type { HarmonyManager } from '../core/harmony';
import type { SynthEngine } from '../core/synth-engine';
import type { Tracker } from '../core/tracker';

export class HoverSoundBehavior {
  private harmony: HarmonyManager;
  private synth: SynthEngine;
  private tracker: Tracker;
  private elements: HTMLElement[] = [];

  constructor(harmony: HarmonyManager, synth: SynthEngine, tracker: Tracker) {
    this.harmony = harmony;
    this.synth = synth;
    this.tracker = tracker;
  }

  attach(selector: SelectorInput, options: HoverSoundOptions = {}): void {
    const {
      enter = 0, // scale degree 0 (root)
      exit = 2,  // scale degree 2 (third)
      voice = 'bell'
    } = options;

    this.elements = this.tracker.normalizeSelector(selector);

    // Skip if touch device (handled by Tracker)
    this.tracker.attachHoverBehavior(this.elements, {
      onEnter: () => {
        const note: number = typeof enter === 'string'
          ? parseInt(enter, 10)
          : this.harmony.getScaleNote(enter, 5); // Higher octave for hover sounds

        this.synth.playNote(note, 0.4, 0.15, voice);
      },
      onLeave: () => {
        const note: number = typeof exit === 'string'
          ? parseInt(exit, 10)
          : this.harmony.getScaleNote(exit, 5);

        this.synth.playNote(note, 0.3, 0.1, voice);
      }
    });
  }

  cleanup(): void {
    this.tracker.cleanup(this.elements);
    this.elements = [];
  }
}
