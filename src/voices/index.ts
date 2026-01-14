import * as Tone from 'tone';
import type { VoiceDefinition } from '../types';

// ============================================================================
// Voice Definitions
// ============================================================================

/**
 * Bell - Bright, clear tone with metallic timbre
 * Uses FM synthesis for bell-like characteristics
 */
export const bell: VoiceDefinition = {
  create: () => {
    const synth = new Tone.FMSynth({
      harmonicity: 3.5,
      modulationIndex: 10,
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.1,
        release: 1.2
      },
      modulation: {
        type: 'sine'
      },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.2
      }
    });
    return synth;
  }
};

/**
 * Pluck - Short, percussive tone
 * Ideal for button clicks and short interactions
 */
export const pluck: VoiceDefinition = {
  create: () => {
    const synth = new Tone.PluckSynth({
      attackNoise: 1,
      dampening: 4000,
      resonance: 0.7
    });
    return synth;
  }
};

/**
 * Pad - Warm, sustained tone
 * Perfect for drones and chord pads
 */
export const pad: VoiceDefinition = {
  create: () => {
    const synth = new Tone.Synth({
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.5,
        decay: 0.3,
        sustain: 0.9,
        release: 2.0
      }
    });
    return synth;
  }
};

/**
 * Synth - Versatile lead synth
 * Good for continuous control and melodic lines
 */
export const synth: VoiceDefinition = {
  create: () => {
    const monoSynth = new Tone.MonoSynth({
      oscillator: {
        type: 'sawtooth'
      },
      envelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.6,
        release: 0.5
      }
    });
    return monoSynth;
  }
};

/**
 * Marimba - Wooden, mellow tone
 * Uses metallic FM synthesis for marimba-like timbre
 */
export const marimba: VoiceDefinition = {
  create: () => {
    const synth = new Tone.FMSynth({
      harmonicity: 3.01,
      modulationIndex: 14,
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.001,
        decay: 0.5,
        sustain: 0.1,
        release: 0.8
      },
      modulation: {
        type: 'sine'
      },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0,
        release: 0.3
      }
    });
    return synth;
  }
};

// ============================================================================
// Voice Registry
// ============================================================================

export const voices: Record<string, VoiceDefinition> = {
  bell,
  pluck,
  pad,
  synth,
  marimba
};

export function getVoice(name: string): VoiceDefinition | undefined {
  return voices[name];
}

export function getAllVoiceNames(): string[] {
  return Object.keys(voices);
}
