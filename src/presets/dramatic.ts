import type { PresetPack } from '../types';

export const dramatic: PresetPack = {
  name: 'dramatic',
  voices: {
    drone: 'pad',
    pluck: 'synth',
    continuous: 'synth',
    arpeggio: 'synth',
    hoverSound: 'synth',
    chordPad: 'pad'
  },
  reverbWet: 0.45,
  reverbDecay: 4.0,
  masterVolume: -8,
  defaultVelocity: 0.85
};
