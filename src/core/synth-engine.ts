import * as Tone from 'tone';
import type { VoiceDefinition, ActiveVoice, SynthEngineConfig, NoteEvent } from '../types';

export class SynthEngine {
  private config: SynthEngineConfig;
  private voices: Map<string, VoiceDefinition> = new Map();
  private activeVoices: Map<string, ActiveVoice> = new Map();
  private nextVoiceId = 0;

  // Audio chain
  private reverb!: Tone.Reverb;
  private compressor!: Tone.Compressor;
  private limiter!: Tone.Limiter;
  private masterVolume!: Tone.Volume;

  private isInitialized = false;
  private isMuted = false;
  private isAudioUnlocked = false;

  // Event callbacks
  private onNotePlayCallback?: (note: NoteEvent) => void;

  constructor(config: Partial<SynthEngineConfig> = {}) {
    this.config = {
      polyphony: config.polyphony ?? 16,
      masterVolume: config.masterVolume ?? -12,
      reverbWet: config.reverbWet ?? 0.2,
      reverbDecay: config.reverbDecay ?? 2.5
    };

    // Auto-suspend when tab is hidden
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.suspend();
        }
      });
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Create audio chain: Voices → Reverb → Compressor → Limiter → Volume → Destination
    this.reverb = new Tone.Reverb({
      decay: this.config.reverbDecay,
      wet: this.config.reverbWet
    });

    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 4,
      attack: 0.003,
      release: 0.1
    });

    this.limiter = new Tone.Limiter(-1);

    this.masterVolume = new Tone.Volume(this.config.masterVolume);

    // Chain effects
    this.reverb.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.masterVolume);
    this.masterVolume.toDestination();

    // Pre-generate reverb impulse response
    await this.reverb.generate();

    this.isInitialized = true;
  }

  async unlock(): Promise<void> {
    if (this.isAudioUnlocked) return;

    await Tone.start();
    this.isAudioUnlocked = true;
  }

  isUnlocked(): boolean {
    return this.isAudioUnlocked;
  }

  private suspend(): void {
    try {
      const context = Tone.getContext();
      if (context.state === 'running' && 'suspend' in context) {
        (context as any).suspend();
      }
    } catch (e) {
      // Ignore suspend errors
    }
  }

  // ============================================================================
  // Voice Registration
  // ============================================================================

  registerVoice(name: string, definition: VoiceDefinition): void {
    this.voices.set(name, definition);
  }

  hasVoice(name: string): boolean {
    return this.voices.has(name);
  }

  // ============================================================================
  // Note Playback
  // ============================================================================

  /**
   * Play a note
   * @returns Voice ID that can be used to stop the note
   */
  playNote(
    note: number,
    velocity: number = 0.7,
    duration?: string | number,
    voiceName: string = 'synth'
  ): string {
    if (!this.isInitialized) {
      console.warn('SynthEngine not initialized');
      return '';
    }

    // Check polyphony limit
    if (this.activeVoices.size >= this.config.polyphony) {
      this.stealVoice();
    }

    // Get or create synth
    const voiceDefinition = this.voices.get(voiceName);
    if (!voiceDefinition) {
      console.warn(`Voice "${voiceName}" not found, using default`);
      return '';
    }

    const synth = voiceDefinition.create();
    synth.connect(this.reverb);

    // Generate unique voice ID
    const voiceId = `voice_${this.nextVoiceId++}`;

    // Convert MIDI note to frequency
    const frequency = Tone.Frequency(note, 'midi').toFrequency();

    // Track active voice
    this.activeVoices.set(voiceId, {
      id: voiceId,
      synth,
      startTime: Tone.now(),
      note,
      velocity
    });

    // Play note
    if (duration !== undefined) {
      // Note with specific duration
      synth.triggerAttackRelease(frequency, duration, Tone.now(), velocity);

      // Schedule cleanup
      const durationSeconds = typeof duration === 'string'
        ? Tone.Time(duration).toSeconds()
        : duration;

      setTimeout(() => {
        this.cleanupVoice(voiceId);
      }, durationSeconds * 1000 + 100); // Add small buffer
    } else {
      // Sustained note (must be released manually)
      synth.triggerAttack(frequency, Tone.now(), velocity);
    }

    // Emit event
    if (this.onNotePlayCallback) {
      this.onNotePlayCallback({ note, velocity, duration, voice: voiceName });
    }

    return voiceId;
  }

  /**
   * Stop a specific note
   */
  stopNote(voiceId: string, releaseTime: number = 0.1): void {
    const voice = this.activeVoices.get(voiceId);
    if (!voice) return;

    voice.synth.triggerRelease(Tone.now() + releaseTime);

    // Schedule cleanup
    setTimeout(() => {
      this.cleanupVoice(voiceId);
    }, (releaseTime + 1) * 1000);
  }

  /**
   * Stop all currently playing notes
   */
  stopAllNotes(): void {
    for (const voiceId of this.activeVoices.keys()) {
      this.stopNote(voiceId);
    }
  }

  // ============================================================================
  // Voice Management
  // ============================================================================

  private stealVoice(): void {
    // Steal the oldest voice
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, voice] of this.activeVoices.entries()) {
      if (voice.startTime < oldestTime) {
        oldestTime = voice.startTime;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.stopNote(oldestId, 0.05); // Quick release
    }
  }

  private cleanupVoice(voiceId: string): void {
    const voice = this.activeVoices.get(voiceId);
    if (!voice) return;

    // Dispose synth
    voice.synth.dispose();

    // Remove from active voices
    this.activeVoices.delete(voiceId);
  }

  getActiveVoiceCount(): number {
    return this.activeVoices.size;
  }

  // ============================================================================
  // Audio Configuration
  // ============================================================================

  setVolume(db: number): void {
    this.config.masterVolume = db;
    if (this.masterVolume) {
      this.masterVolume.volume.rampTo(db, 0.1);
    }
  }

  getVolume(): number {
    return this.config.masterVolume;
  }

  mute(): void {
    if (!this.isMuted && this.masterVolume) {
      this.masterVolume.volume.rampTo(-Infinity, 0.5);
      this.isMuted = true;
    }
  }

  unmute(): void {
    if (this.isMuted && this.masterVolume) {
      this.masterVolume.volume.rampTo(this.config.masterVolume, 0.5);
      this.isMuted = false;
    }
  }

  setReverbWet(wet: number): void {
    this.config.reverbWet = wet;
    if (this.reverb) {
      this.reverb.wet.rampTo(wet, 0.5);
    }
  }

  setReverbDecay(decay: number): void {
    this.config.reverbDecay = decay;
    if (this.reverb) {
      this.reverb.decay = decay;
    }
  }

  updateConfig(config: Partial<SynthEngineConfig>): void {
    if (config.masterVolume !== undefined) {
      this.setVolume(config.masterVolume);
    }
    if (config.reverbWet !== undefined) {
      this.setReverbWet(config.reverbWet);
    }
    if (config.reverbDecay !== undefined) {
      this.setReverbDecay(config.reverbDecay);
    }
    if (config.polyphony !== undefined) {
      this.config.polyphony = config.polyphony;
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  onNotePlay(callback: (note: NoteEvent) => void): void {
    this.onNotePlayCallback = callback;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    // Stop all notes
    this.stopAllNotes();

    // Wait a bit for releases to complete
    setTimeout(() => {
      // Dispose all active voices
      for (const voice of this.activeVoices.values()) {
        voice.synth.dispose();
      }
      this.activeVoices.clear();

      // Dispose effects
      if (this.reverb) this.reverb.dispose();
      if (this.compressor) this.compressor.dispose();
      if (this.limiter) this.limiter.dispose();
      if (this.masterVolume) this.masterVolume.dispose();

      this.isInitialized = false;
    }, 1000);
  }
}
