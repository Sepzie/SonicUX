import type { HarmonyState, ModulationType, RomanNumeral, ModeDefinition } from '../types';

// MIDI note number for middle C
const MIDDLE_C = 60;

// Note name to semitone offset from C
const NOTE_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11
};

// Mode definitions as interval patterns
const MODES: Record<string, ModeDefinition> = {
  // Major modes
  major: { intervals: [0, 2, 4, 5, 7, 9, 11] },
  lydian: { intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { intervals: [0, 2, 4, 5, 7, 9, 10] },

  // Minor modes
  minor: { intervals: [0, 2, 3, 5, 7, 8, 10] },
  dorian: { intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { intervals: [0, 1, 3, 5, 7, 8, 10] },

  // Pentatonic
  pentatonic_major: { intervals: [0, 2, 4, 7, 9] },
  pentatonic_minor: { intervals: [0, 3, 5, 7, 10] }
};

// Roman numeral to scale degree mapping
const ROMAN_TO_DEGREE: Record<string, { degree: number; type: 'major' | 'minor' | 'diminished' }> = {
  'I': { degree: 0, type: 'major' },
  'II': { degree: 1, type: 'major' },
  'III': { degree: 2, type: 'major' },
  'IV': { degree: 3, type: 'major' },
  'V': { degree: 4, type: 'major' },
  'VI': { degree: 5, type: 'major' },
  'VII': { degree: 6, type: 'major' },
  'i': { degree: 0, type: 'minor' },
  'ii': { degree: 1, type: 'minor' },
  'iii': { degree: 2, type: 'minor' },
  'iv': { degree: 3, type: 'minor' },
  'v': { degree: 4, type: 'minor' },
  'vi': { degree: 5, type: 'minor' },
  'vii': { degree: 6, type: 'minor' },
  'vii°': { degree: 6, type: 'diminished' },
  'viio': { degree: 6, type: 'diminished' }
};

export class HarmonyManager {
  private state: HarmonyState;
  private rootNote: number;
  private chordPool: RomanNumeral[] = ['I', 'IV', 'V', 'vi'];

  constructor(key: string = 'C', mode: string = 'major') {
    this.rootNote = NOTE_MAP[key] ?? 0;
    const modeDefinition = MODES[mode] ?? MODES.major;

    this.state = {
      key,
      mode,
      scale: modeDefinition.intervals,
      chord: this.buildChord('I', 4),
      isLocked: false
    };
  }

  // ============================================================================
  // Key & Scale Management
  // ============================================================================

  setKey(key: string, mode: string): void {
    this.rootNote = NOTE_MAP[key] ?? 0;
    const modeDefinition = MODES[mode] ?? MODES.major;

    this.state.key = key;
    this.state.mode = mode;
    this.state.scale = modeDefinition.intervals;

    // Update chord with new key/mode
    if (!this.state.isLocked) {
      this.state.chord = this.buildChord('I', 4);
    }
  }

  setScale(intervals: number[]): void {
    this.state.scale = intervals;
    this.state.mode = 'custom';
  }

  getState(): HarmonyState {
    return { ...this.state };
  }

  getCurrentScale(): number[] {
    return [...this.state.scale];
  }

  getCurrentChord(): number[] {
    return [...this.state.chord];
  }

  // ============================================================================
  // Scale Degree to MIDI Conversion
  // ============================================================================

  /**
   * Convert scale degree to MIDI note number
   * @param degree - Scale degree (0-based, wraps for octaves)
   * @param octave - MIDI octave (4 = middle C octave)
   */
  getScaleNote(degree: number, octave: number = 4): number {
    const scaleLength = this.state.scale.length;
    const octaveOffset = Math.floor(degree / scaleLength);
    const scaleDegree = degree % scaleLength;

    const baseNote = MIDDLE_C + (octave - 4) * 12;
    const noteOffset = this.rootNote + this.state.scale[scaleDegree];

    return baseNote + noteOffset + (octaveOffset * 12);
  }

  /**
   * Get a random note from the current scale
   */
  getRandomScaleNote(octave: number = 4): number {
    const degree = Math.floor(Math.random() * this.state.scale.length);
    return this.getScaleNote(degree, octave);
  }

  /**
   * Quantize a MIDI note to the nearest scale note
   */
  quantizeToScale(note: number): number {
    const octave = Math.floor(note / 12) - 1;
    const semitone = note % 12;
    const keyOffset = (semitone - this.rootNote + 12) % 12;

    // Find nearest scale degree
    let nearest = this.state.scale[0];
    let minDiff = Math.abs(keyOffset - nearest);

    for (const interval of this.state.scale) {
      const diff = Math.abs(keyOffset - interval);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = interval;
      }
    }

    return octave * 12 + 12 + this.rootNote + nearest;
  }

  // ============================================================================
  // Chord Management
  // ============================================================================

  /**
   * Build a chord from a Roman numeral
   */
  getChord(roman: RomanNumeral, octave: number = 4): number[] {
    return this.buildChord(roman, octave);
  }

  private buildChord(roman: RomanNumeral, octave: number = 4): number[] {
    const chordInfo = ROMAN_TO_DEGREE[roman];
    if (!chordInfo) {
      // Default to I chord if roman numeral not found
      return this.buildChord('I', octave);
    }

    const { degree, type } = chordInfo;
    const root = this.getScaleNote(degree, octave);

    if (type === 'major') {
      // Major chord: root, major third, perfect fifth
      return [
        root,
        this.getScaleNote(degree + 2, octave),
        this.getScaleNote(degree + 4, octave)
      ];
    } else if (type === 'minor') {
      // Minor chord: root, minor third, perfect fifth
      // We approximate by using scale degrees
      return [
        root,
        this.getScaleNote(degree + 2, octave),
        this.getScaleNote(degree + 4, octave)
      ];
    } else {
      // Diminished chord: root, minor third, diminished fifth
      return [
        root,
        this.getScaleNote(degree + 2, octave),
        this.getScaleNote(degree + 4, octave)
      ];
    }
  }

  /**
   * Set current chord manually
   */
  setChord(notes: number[]): void {
    this.state.chord = notes;
  }

  /**
   * Set chord from Roman numeral
   */
  setChordFromRoman(roman: RomanNumeral, octave: number = 4): void {
    if (!this.state.isLocked) {
      this.state.chord = this.buildChord(roman, octave);
    }
  }

  // ============================================================================
  // Harmony Locking
  // ============================================================================

  lockHarmony(): void {
    this.state.isLocked = true;
  }

  unlockHarmony(): void {
    this.state.isLocked = false;
  }

  isLocked(): boolean {
    return this.state.isLocked;
  }

  // ============================================================================
  // Modulation
  // ============================================================================

  /**
   * Modulate to a related key
   */
  modulate(type: ModulationType): void {
    switch (type) {
      case 'relative':
        this.modulateRelative();
        break;
      case 'dominant':
        this.modulateDominant();
        break;
      case 'subdominant':
        this.modulateSubdominant();
        break;
    }
  }

  private modulateRelative(): void {
    // Major <-> relative minor (3 semitones down)
    if (this.state.mode === 'major') {
      this.rootNote = (this.rootNote + 9) % 12; // 3 semitones down = 9 semitones up
      this.state.mode = 'minor';
      this.state.scale = MODES.minor.intervals;
    } else if (this.state.mode === 'minor') {
      this.rootNote = (this.rootNote + 3) % 12; // 3 semitones up
      this.state.mode = 'major';
      this.state.scale = MODES.major.intervals;
    }

    this.updateKeyName();
  }

  private modulateDominant(): void {
    // Up a perfect fifth (7 semitones)
    this.rootNote = (this.rootNote + 7) % 12;
    this.updateKeyName();
  }

  private modulateSubdominant(): void {
    // Up a perfect fourth (5 semitones)
    this.rootNote = (this.rootNote + 5) % 12;
    this.updateKeyName();
  }

  private updateKeyName(): void {
    // Find key name from root note
    for (const [name, value] of Object.entries(NOTE_MAP)) {
      if (value === this.rootNote && !name.includes('#') && !name.includes('b')) {
        this.state.key = name;
        return;
      }
    }
    // Fallback to first match
    for (const [name, value] of Object.entries(NOTE_MAP)) {
      if (value === this.rootNote) {
        this.state.key = name;
        return;
      }
    }
  }

  // ============================================================================
  // Chord Pool
  // ============================================================================

  setChordPool(chords: RomanNumeral[]): void {
    this.chordPool = chords;
  }

  getChordPool(): RomanNumeral[] {
    return [...this.chordPool];
  }

  /**
   * Get a random chord from the pool
   */
  getRandomChordFromPool(octave: number = 4): number[] {
    const randomRoman = this.chordPool[Math.floor(Math.random() * this.chordPool.length)];
    return this.buildChord(randomRoman, octave);
  }
}
