import * as Tone from 'tone';
import type { DroneOptions, DroneSectionZone, RomanNumeral } from '../types';
import type { HarmonyManager } from '../core/harmony';
import type { SynthEngine } from '../core/synth-engine';
import type { Tracker } from '../core/tracker';

export class DroneBehavior {
  private harmony: HarmonyManager;
  private _synthEngine: SynthEngine;
  private tracker: Tracker;
  private isActive = false;
  private voices: Tone.Synth[] = [];
  private voiceVolumes: Tone.Volume[] = [];
  private currentChord: number[] = [];
  private sectionObserver?: IntersectionObserver;
  private sections: DroneSectionZone[] = [];

  // Mouse tracking
  private mouseX = 0.5;
  private mouseY = 0.5;
  private mouseVelocityMagnitude = 0;

  constructor(harmony: HarmonyManager, synth: SynthEngine, tracker: Tracker) {
    this.harmony = harmony;
    this._synthEngine = synth;
    this.tracker = tracker;
  }

  // ============================================================================
  // Start/Stop
  // ============================================================================

  start(options: DroneOptions = {}): void {
    if (this.isActive) return;

    const {
      chord = 'I',
      voices = 3,
      mousePosition = true,
      mouseVelocity = 0.2,
      volume = -18
    } = options;

    this.isActive = true;

    // Get chord notes
    this.currentChord = this.harmony.getChord(chord as RomanNumeral, 3);

    // Create drone voices
    for (let i = 0; i < voices; i++) {
      const voice = new Tone.Synth({
        oscillator: {
          type: 'sine'
        },
        envelope: {
          attack: 2.0,
          decay: 0.5,
          sustain: 1.0,
          release: 3.0
        }
      });

      const voiceVolume = new Tone.Volume(volume);
      voice.connect(voiceVolume);
      voiceVolume.toDestination();

      this.voices.push(voice);
      this.voiceVolumes.push(voiceVolume);

      // Play chord note
      const note = this.currentChord[i % this.currentChord.length];
      const frequency = Tone.Frequency(note, 'midi').toFrequency();
      voice.triggerAttack(frequency, Tone.now(), 0.3);
    }

    // Setup mouse tracking if enabled
    if (mousePosition) {
      this.setupMouseTracking(mouseVelocity);
    }
  }

  stop(): void {
    if (!this.isActive) return;

    // Release all voices
    this.voices.forEach(voice => {
      voice.triggerRelease(Tone.now());
    });

    // Cleanup after release
    setTimeout(() => {
      this.voices.forEach(voice => voice.dispose());
      this.voiceVolumes.forEach(vol => vol.dispose());
      this.voices = [];
      this.voiceVolumes = [];
      this.isActive = false;
    }, 3000);

    // Clean up section observer
    if (this.sectionObserver) {
      this.sectionObserver.disconnect();
      this.sectionObserver = undefined;
    }
  }

  // ============================================================================
  // Section-based Chord Changes
  // ============================================================================

  setupSections(zones: DroneSectionZone[]): void {
    this.sections = zones;

    // Get all section elements
    const elements = zones.map(zone => document.querySelector(zone.selector)).filter(el => el) as HTMLElement[];

    if (elements.length === 0) return;

    // Create intersection observer to detect which section is in viewport
    this.sectionObserver = this.tracker.attachIntersectionObserver(
      elements,
      (element, isIntersecting) => {
        if (isIntersecting && this.isActive) {
          // Find which zone this element belongs to
          const zone = zones.find(z => document.querySelector(z.selector) === element);
          if (zone) {
            this.changeChord(zone.chord);
          }
        }
      },
      {
        threshold: 0.5,
        rootMargin: '-20% 0px -20% 0px'
      }
    );
  }

  private changeChord(roman: RomanNumeral): void {
    const newChord = this.harmony.getChord(roman, 3);

    // Smoothly transition each voice to new chord tone
    this.voices.forEach((voice, i) => {
      const newNote = newChord[i % newChord.length];
      const frequency = Tone.Frequency(newNote, 'midi').toFrequency();

      // Glide to new frequency
      voice.frequency.rampTo(frequency, 1.0);
    });

    this.currentChord = newChord;
  }

  // ============================================================================
  // Mouse Tracking
  // ============================================================================

  private setupMouseTracking(velocityInfluence: number): void {
    this.tracker.attachGlobalMouseTracking((x, y, vx, vy) => {
      // Normalize position to 0-1
      this.mouseX = x / window.innerWidth;
      this.mouseY = y / window.innerHeight;

      // Calculate velocity magnitude
      this.mouseVelocityMagnitude = Math.sqrt(vx * vx + vy * vy);

      // Update voice volumes based on position
      this.updateVoiceVolumes(velocityInfluence);
    });
  }

  private updateVoiceVolumes(velocityInfluence: number): void {
    if (this.voiceVolumes.length === 0) return;

    const baseVolume = -18;

    this.voiceVolumes.forEach((volume, i) => {
      // Create spatial distribution based on voice index
      const voicePosition = i / Math.max(this.voiceVolumes.length - 1, 1);

      // Calculate distance from mouse
      const distanceX = Math.abs(this.mouseX - voicePosition);

      // Closer voices are louder
      const positionBoost = (1 - distanceX) * 6; // Up to +6dB boost

      // Add velocity boost
      const velocityBoost = Math.min(this.mouseVelocityMagnitude * velocityInfluence * 0.001, 3); // Up to +3dB

      const targetVolume = baseVolume + positionBoost + velocityBoost;

      // Smooth ramp to target volume
      volume.volume.rampTo(targetVolume, 0.2);
    });
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  cleanup(): void {
    this.stop();
  }
}
