import type { PresetPack } from '../types';

export const playful: PresetPack = {
  name: 'playful',
  voices: {
    drone: 'synth',
    pluck: 'pluck',
    continuous: 'synth',
    arpeggio: 'marimba',
    hoverSound: 'pluck',
    chordPad: 'synth'
  },
  reverbWet: 0.15,
  reverbDecay: 1.5,
  masterVolume: -10,
  defaultVelocity: 0.75
};
