import type { PresetPack } from '../types';

export const ambient: PresetPack = {
  name: 'ambient',
  voices: {
    drone: 'pad',
    pluck: 'bell',
    continuous: 'synth',
    arpeggio: 'bell',
    hoverSound: 'bell',
    chordPad: 'pad'
  },
  reverbWet: 0.35,
  reverbDecay: 3.0,
  masterVolume: -15,
  defaultVelocity: 0.5
};
