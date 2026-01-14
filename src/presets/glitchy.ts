import type { PresetPack } from '../types';

export const glitchy: PresetPack = {
  name: 'glitchy',
  voices: {
    drone: 'synth',
    pluck: 'pluck',
    continuous: 'synth',
    arpeggio: 'pluck',
    hoverSound: 'pluck',
    chordPad: 'synth'
  },
  reverbWet: 0.1,
  reverbDecay: 0.8,
  masterVolume: -12,
  defaultVelocity: 0.9
};
