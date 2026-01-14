import type { SelectorInput, PluckOptions } from '../types';
import type { HarmonyManager } from '../core/harmony';
import type { SynthEngine } from '../core/synth-engine';
import type { Tracker } from '../core/tracker';

export class PluckBehavior {
  private harmony: HarmonyManager;
  private synth: SynthEngine;
  private tracker: Tracker;
  private elements: HTMLElement[] = [];
  private sequentialIndex = 0;

  constructor(harmony: HarmonyManager, synth: SynthEngine, tracker: Tracker) {
    this.harmony = harmony;
    this.synth = synth;
    this.tracker = tracker;
  }

  attach(selector: SelectorInput, options: PluckOptions = {}): void {
    const {
      voice = 'pluck',
      velocity = 0.7,
      noteSelection = 'random',
      octave = 4,
      onNote
    } = options;

    this.elements = this.tracker.normalizeSelector(selector);

    this.tracker.attachPointerBehavior(this.elements, {
      onDown: (_event, element) => {
        const note = this.selectNote(noteSelection, element, octave);
        this.synth.playNote(note, velocity, 0.2, voice);

        if (onNote) {
          onNote(note);
        }
      }
    });
  }

  private selectNote(mode: 'random' | 'sequential' | 'position', element: HTMLElement, octave: number): number {
    const scale = this.harmony.getCurrentScale();

    switch (mode) {
      case 'random':
        return this.harmony.getRandomScaleNote(octave);

      case 'sequential':
        const degree = this.sequentialIndex % scale.length;
        this.sequentialIndex++;
        return this.harmony.getScaleNote(degree, octave);

      case 'position': {
        // Map element position in list to scale degree
        const index = this.elements.indexOf(element);
        if (index === -1) return this.harmony.getScaleNote(0, octave);

        const degree = index % scale.length;
        return this.harmony.getScaleNote(degree, octave);
      }

      default:
        return this.harmony.getRandomScaleNote(octave);
    }
  }

  cleanup(): void {
    this.tracker.cleanup(this.elements);
    this.elements = [];
  }
}
