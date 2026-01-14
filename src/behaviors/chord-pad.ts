import type { SelectorInput, ChordPadOptions, RomanNumeral } from '../types';
import type { HarmonyManager } from '../core/harmony';
import type { SynthEngine } from '../core/synth-engine';
import type { Tracker } from '../core/tracker';

export class ChordPadBehavior {
  private harmony: HarmonyManager;
  private synth: SynthEngine;
  private tracker: Tracker;
  private elements: HTMLElement[] = [];
  private activeChords: Map<HTMLElement, string[]> = new Map();

  constructor(harmony: HarmonyManager, synth: SynthEngine, tracker: Tracker) {
    this.harmony = harmony;
    this.synth = synth;
    this.tracker = tracker;
  }

  attach(selector: SelectorInput, options: ChordPadOptions = {}): void {
    const {
      chord = 'I',
      voice = 'pad',
      fadeOut = 0.5,
      volume = 0.4
    } = options;

    this.elements = this.tracker.normalizeSelector(selector);

    // Skip if touch device (handled by Tracker)
    this.tracker.attachHoverBehavior(this.elements, {
      onEnter: (_event, element) => {
        // Determine which chord to play
        const chordNotes = Array.isArray(chord)
          ? chord
          : this.harmony.getChord(chord as RomanNumeral, 3); // Lower octave for pads

        // Store active voice IDs for this element
        const voiceIds: string[] = [];

        // Play each note in the chord
        chordNotes.forEach(note => {
          const voiceId = this.synth.playNote(note, volume, undefined, voice);
          voiceIds.push(voiceId);
        });

        this.activeChords.set(element, voiceIds);
      },
      onLeave: (_event, element) => {
        // Stop all voices for this element
        const voiceIds = this.activeChords.get(element);
        if (voiceIds) {
          voiceIds.forEach(voiceId => {
            this.synth.stopNote(voiceId, fadeOut);
          });
          this.activeChords.delete(element);
        }
      }
    });
  }

  cleanup(): void {
    // Stop all active chords
    for (const [_element, voiceIds] of this.activeChords.entries()) {
      voiceIds.forEach(voiceId => {
        this.synth.stopNote(voiceId, 0.1);
      });
    }
    this.activeChords.clear();

    this.tracker.cleanup(this.elements);
    this.elements = [];
  }
}
