import * as Tone from 'tone';
import type { SelectorInput, ArpeggioOptions } from '../types';
import type { HarmonyManager } from '../core/harmony';
import type { SynthEngine } from '../core/synth-engine';
import type { Tracker } from '../core/tracker';

export class ArpeggioBehavior {
  private harmony: HarmonyManager;
  private synth: SynthEngine;
  private tracker: Tracker;
  private elements: HTMLElement[] = [];
  private activePatterns: Map<HTMLElement, Tone.Pattern<number>> = new Map();

  constructor(harmony: HarmonyManager, synth: SynthEngine, tracker: Tracker) {
    this.harmony = harmony;
    this.synth = synth;
    this.tracker = tracker;
  }

  attach(selector: SelectorInput, options: ArpeggioOptions = {}): void {
    const {
      pattern = 'up',
      speed = '8n',
      notes = [0, 2, 4, 7], // Default to chord tones
      voice = 'bell',
      octave = 4
    } = options;

    this.elements = this.tracker.normalizeSelector(selector);

    this.tracker.attachPointerBehavior(this.elements, {
      onDown: (_event, element) => {
        // Generate note sequence from scale degrees
        const noteSequence = notes.map(degree => this.harmony.getScaleNote(degree, octave));

        // Create pattern based on mode
        const patternType = this.getPatternType(pattern);

        // Create Tone.Pattern
        const tonePattern = new Tone.Pattern<number>((_time, note) => {
          this.synth.playNote(note, 0.6, speed, voice);
        }, noteSequence, patternType);

        // Set pattern interval
        tonePattern.interval = speed;

        // Start pattern
        tonePattern.start(0);
        Tone.Transport.start();

        this.activePatterns.set(element, tonePattern);
      },

      onUp: (_event, element) => {
        const tonePattern = this.activePatterns.get(element);
        if (tonePattern) {
          tonePattern.stop();
          this.activePatterns.delete(element);

          // Stop transport if no patterns are active
          if (this.activePatterns.size === 0) {
            Tone.Transport.stop();
          }
        }
      }
    });

    // Also handle global pointer up
    window.addEventListener('pointerup', () => {
      this.elements.forEach(element => {
        const tonePattern = this.activePatterns.get(element);
        if (tonePattern) {
          tonePattern.stop();
          this.activePatterns.delete(element);
        }
      });

      if (this.activePatterns.size === 0) {
        Tone.Transport.stop();
      }
    });
  }

  private getPatternType(pattern: 'up' | 'down' | 'upDown' | 'random'): 'up' | 'down' | 'upDown' | 'random' {
    return pattern;
  }

  cleanup(): void {
    // Stop all active patterns
    for (const [_element, tonePattern] of this.activePatterns.entries()) {
      tonePattern.stop();
      tonePattern.dispose();
    }
    this.activePatterns.clear();

    // Stop transport
    Tone.Transport.stop();

    this.tracker.cleanup(this.elements);
    this.elements = [];
  }
}
