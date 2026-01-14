import type { PresetPack } from '../types';
import { ambient } from './ambient';
import { playful } from './playful';
import { dramatic } from './dramatic';
import { glitchy } from './glitchy';

const presets: Record<string, PresetPack> = {
  ambient,
  playful,
  dramatic,
  glitchy
};

export function getPreset(name: string): PresetPack {
  return presets[name] || ambient;
}

export function listPresets(): string[] {
  return Object.keys(presets);
}

export { ambient, playful, dramatic, glitchy };
