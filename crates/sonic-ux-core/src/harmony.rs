//! Harmonic state management and presets.
//!
//! Handles key, mode, chord progressions, and modulation.

use crate::types::{HarmonyState, Mode};

/// Named presets that configure scale, chord pool, and modulation behavior.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Preset {
    /// Lush, dreamy - Major/Lydian, slow modulation, rich chords
    #[default]
    Ambient,
    /// Sparse, calm - Pentatonic, reduced motion friendly, fewer notes
    Minimal,
    /// Tense, cinematic - Minor/Dorian, higher tension ceiling, darker
    Dramatic,
    /// Bright, bouncy - Major pentatonic, quicker changes, lighter feel
    Playful,
}

impl Preset {
    /// Get the default mode for this preset.
    pub fn default_mode(&self) -> Mode {
        match self {
            Preset::Ambient => Mode::Lydian,
            Preset::Minimal => Mode::PentatonicMajor,
            Preset::Dramatic => Mode::Dorian,
            Preset::Playful => Mode::PentatonicMajor,
        }
    }

    /// Get the modulation rate for this preset (0..1).
    /// Higher values mean more frequent key changes.
    pub fn modulation_rate(&self) -> f32 {
        match self {
            Preset::Ambient => 0.1,
            Preset::Minimal => 0.05,
            Preset::Dramatic => 0.2,
            Preset::Playful => 0.3,
        }
    }

    /// Get the tension ceiling for this preset (0..1).
    pub fn tension_ceiling(&self) -> f32 {
        match self {
            Preset::Ambient => 0.5,
            Preset::Minimal => 0.3,
            Preset::Dramatic => 0.9,
            Preset::Playful => 0.4,
        }
    }

    /// Get event density multiplier for this preset.
    /// Lower values = fewer events generated.
    pub fn event_density(&self) -> f32 {
        match self {
            Preset::Ambient => 0.6,
            Preset::Minimal => 0.3,
            Preset::Dramatic => 0.8,
            Preset::Playful => 1.0,
        }
    }

    /// Parse preset from string name.
    pub fn from_name(name: &str) -> Option<Self> {
        match name.to_lowercase().as_str() {
            "ambient" => Some(Preset::Ambient),
            "minimal" => Some(Preset::Minimal),
            "dramatic" => Some(Preset::Dramatic),
            "playful" => Some(Preset::Playful),
            _ => None,
        }
    }
}

/// Manages harmonic state and transitions.
#[derive(Debug)]
pub struct HarmonyManager {
    /// Current harmonic state
    state: HarmonyState,
    /// Active preset
    preset: Preset,
    /// Custom modulation rate override (if set)
    modulation_rate_override: Option<f32>,
    /// Custom chord pool (if set)
    chord_pool: Option<Vec<ChordDegree>>,
    /// Time since last modulation (ms)
    time_since_modulation: u64,
    /// RNG for harmonic decisions
    rng: fastrand::Rng,
}

/// Chord degrees in Roman numeral notation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChordDegree {
    I,
    II,
    III,
    IV,
    V,
    VI,
    VII,
}

impl HarmonyManager {
    /// Create a new harmony manager with the given preset.
    pub fn new(seed: u64, preset: Preset) -> Self {
        Self {
            state: HarmonyState {
                root: 0, // C
                mode: preset.default_mode(),
                tension: 0.3,
            },
            preset,
            modulation_rate_override: None,
            chord_pool: None,
            time_since_modulation: 0,
            rng: fastrand::Rng::with_seed(seed),
        }
    }

    /// Get current harmonic state.
    pub fn state(&self) -> HarmonyState {
        self.state
    }

    /// Get current preset.
    pub fn preset(&self) -> Preset {
        self.preset
    }

    /// Set a new preset.
    pub fn set_preset(&mut self, preset: Preset) {
        self.preset = preset;
        self.state.mode = preset.default_mode();
    }

    /// Set root and mode directly.
    pub fn set_scale(&mut self, root: u8, mode: Mode) {
        self.state.root = root % 12;
        self.state.mode = mode;
    }

    /// Set custom chord pool.
    pub fn set_chord_pool(&mut self, chords: Vec<ChordDegree>) {
        self.chord_pool = Some(chords);
    }

    /// Set modulation rate override.
    pub fn set_modulation_rate(&mut self, rate: f32) {
        self.modulation_rate_override = Some(rate.clamp(0.0, 1.0));
    }

    /// Update harmony state based on elapsed time and activity.
    /// Returns Some((new_root, new_mode)) if a modulation occurred.
    pub fn update(&mut self, dt_ms: u64, activity: f32) -> Option<(u8, Mode)> {
        self.time_since_modulation += dt_ms;

        // Update tension based on activity
        let target_tension = activity * self.preset.tension_ceiling();
        self.state.tension = lerp(self.state.tension, target_tension, 0.1);

        // Check for modulation
        let rate = self.modulation_rate_override.unwrap_or(self.preset.modulation_rate());
        let modulation_threshold_ms = (10000.0 / (rate + 0.01)) as u64;

        if self.time_since_modulation > modulation_threshold_ms && self.rng.f32() < rate {
            self.time_since_modulation = 0;
            let new_root = self.pick_modulation_target();
            self.state.root = new_root;
            return Some((new_root, self.state.mode));
        }

        None
    }

    /// Pick a musically sensible modulation target.
    fn pick_modulation_target(&mut self) -> u8 {
        // Common modulation targets: up/down a fifth, relative major/minor
        let options = [
            (self.state.root + 7) % 12,  // up a fifth
            (self.state.root + 5) % 12,  // up a fourth (down a fifth)
            (self.state.root + 9) % 12,  // relative major/minor
            (self.state.root + 3) % 12,  // up a minor third
        ];
        options[self.rng.usize(..options.len())]
    }

    /// Get a note from the current scale.
    pub fn scale_note(&self, degree: usize, octave: u8) -> u8 {
        let intervals = self.state.mode.intervals();
        let interval = intervals[degree % intervals.len()];
        self.state.root + interval + (octave * 12)
    }

    /// Get chord notes for a given degree.
    pub fn chord_notes(&self, degree: ChordDegree, octave: u8) -> Vec<u8> {
        let intervals = self.state.mode.intervals();
        let degree_idx = match degree {
            ChordDegree::I => 0,
            ChordDegree::II => 1,
            ChordDegree::III => 2,
            ChordDegree::IV => 3,
            ChordDegree::V => 4,
            ChordDegree::VI => 5,
            ChordDegree::VII => 6,
        };

        // Build triad from scale degrees
        let root = intervals[degree_idx % intervals.len()];
        let third = intervals[(degree_idx + 2) % intervals.len()];
        let fifth = intervals[(degree_idx + 4) % intervals.len()];

        let base = self.state.root + (octave * 12);
        vec![base + root, base + third, base + fifth]
    }
}

/// Linear interpolation helper.
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preset_defaults() {
        assert_eq!(Preset::Ambient.default_mode(), Mode::Lydian);
        assert_eq!(Preset::Minimal.default_mode(), Mode::PentatonicMajor);
    }

    #[test]
    fn test_mode_intervals() {
        assert_eq!(Mode::Major.intervals(), &[0, 2, 4, 5, 7, 9, 11]);
        assert_eq!(Mode::PentatonicMinor.intervals(), &[0, 3, 5, 7, 10]);
    }
}
