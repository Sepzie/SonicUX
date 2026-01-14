import * as Tone from 'tone';
import type { SelectorInput, ContinuousOptions } from '../types';
import type { HarmonyManager } from '../core/harmony';
import type { SynthEngine } from '../core/synth-engine';
import type { Tracker } from '../core/tracker';

export class ContinuousBehavior {
  private harmony: HarmonyManager;
  private _synthEngine: SynthEngine;
  private tracker: Tracker;
  private elements: HTMLElement[] = [];
  private activeSynths: Map<HTMLElement, { synth: Tone.MonoSynth; voiceId: string }> = new Map();

  constructor(harmony: HarmonyManager, synth: SynthEngine, tracker: Tracker) {
    this.harmony = harmony;
    this._synthEngine = synth;
    this.tracker = tracker;
  }

  attach(selector: SelectorInput, options: ContinuousOptions = {}): void {
    const {
      xAxis = 'pitch',
      yAxis = 'filter',
      portamento = 0.05,
      octave = 4
    } = options;

    this.elements = this.tracker.normalizeSelector(selector);

    this.tracker.attachPointerBehavior(this.elements, {
      onDown: (event, element) => {
        // Create a dedicated MonoSynth for this interaction
        const monoSynth = new Tone.MonoSynth({
          oscillator: {
            type: 'sawtooth'
          },
          envelope: {
            attack: 0.02,
            decay: 0.2,
            sustain: 0.8,
            release: 0.5
          },
          filter: {
            type: 'lowpass',
            frequency: 1200,
            rolloff: -24
          },
          filterEnvelope: {
            attack: 0.05,
            decay: 0.3,
            sustain: 0.4,
            release: 0.8,
            baseFrequency: 200,
            octaves: 4
          },
          portamento: portamento
        });

        // Connect to audio chain (assuming we can get the reverb from SynthEngine)
        monoSynth.toDestination();

        // Calculate initial note from position
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const note = this.calculateNoteFromPosition(x, octave);
        const frequency = Tone.Frequency(note, 'midi').toFrequency();

        // Start the note
        monoSynth.triggerAttack(frequency, Tone.now(), 0.7);

        // Apply Y-axis control
        this.applyYAxisControl(monoSynth, event, element, yAxis);

        // Store the synth
        this.activeSynths.set(element, { synth: monoSynth, voiceId: '' });
      },

      onMove: (event, element) => {
        const active = this.activeSynths.get(element);
        if (!active) return;

        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;

        // Update pitch
        if (xAxis === 'pitch') {
          const note = this.calculateNoteFromPosition(x, octave);
          const frequency = Tone.Frequency(note, 'midi').toFrequency();
          active.synth.frequency.rampTo(frequency, 0.05);
        }

        // Update Y-axis control
        this.applyYAxisControl(active.synth, event, element, yAxis);
      },

      onUp: (_event, element) => {
        const active = this.activeSynths.get(element);
        if (!active) return;

        // Release the note
        active.synth.triggerRelease(Tone.now());

        // Cleanup after release
        setTimeout(() => {
          active.synth.dispose();
          this.activeSynths.delete(element);
        }, 1000);
      }
    });

    // Also handle global pointer up (in case pointer leaves element)
    window.addEventListener('pointerup', () => {
      this.elements.forEach(_element => {
        const active = this.activeSynths.get(_element);
        if (active) {
          active.synth.triggerRelease(Tone.now());
          setTimeout(() => {
            active.synth.dispose();
            this.activeSynths.delete(_element);
          }, 1000);
        }
      });
    });
  }

  private calculateNoteFromPosition(x: number, octave: number): number {
    // Map X position to scale degree
    const scale = this.harmony.getCurrentScale();
    const scaleDegree = Math.floor(x * scale.length * 2); // Span 2 octaves
    return this.harmony.getScaleNote(scaleDegree, octave);
  }

  private applyYAxisControl(
    monoSynth: Tone.MonoSynth,
    event: PointerEvent,
    element: HTMLElement,
    yAxis: 'waveform' | 'filter'
  ): void {
    const rect = element.getBoundingClientRect();
    const y = 1 - ((event.clientY - rect.top) / rect.height); // Invert Y (bottom = 0, top = 1)

    if (yAxis === 'filter') {
      // Map Y to filter frequency (200Hz - 4000Hz)
      const frequency = 200 + (y * 3800);
      monoSynth.filter.frequency.rampTo(frequency, 0.05);
    } else if (yAxis === 'waveform') {
      // Map Y to waveform types
      // This is simplified - would need more sophisticated morphing for production
      const types: ('sine' | 'triangle' | 'sawtooth' | 'square')[] = ['sine', 'triangle', 'sawtooth', 'square'];
      const index = Math.min(Math.floor(y * types.length), types.length - 1);
      monoSynth.oscillator.type = types[index];
    }
  }

  cleanup(): void {
    // Stop all active synths
    for (const [_element, active] of this.activeSynths.entries()) {
      active.synth.triggerRelease(Tone.now());
      setTimeout(() => {
        active.synth.dispose();
      }, 100);
    }
    this.activeSynths.clear();

    this.tracker.cleanup(this.elements);
    this.elements = [];
  }
}
