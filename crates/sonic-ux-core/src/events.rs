//! Event generation from interactions.
//!
//! Converts interaction events and state changes into musical events.

use crate::harmony::{ChordDegree, HarmonyManager, Preset};
use crate::types::{InteractionEvent, MusicEvent};

/// Generates musical events from interactions.
#[derive(Debug)]
pub struct EventGenerator {
    /// RNG for event decisions
    rng: fastrand::Rng,
    /// Time since last event (ms)
    time_since_event: u64,
    /// Minimum time between events (ms)
    min_event_interval: u64,
    /// Current event density (from preset or reduced motion)
    event_density: f32,
    /// Last section ID (for detecting changes)
    last_section_id: u32,
    /// Last hover ID (for detecting changes)
    last_hover_id: u32,
}

impl EventGenerator {
    /// Create a new event generator.
    pub fn new(seed: u64) -> Self {
        Self {
            rng: fastrand::Rng::with_seed(seed),
            time_since_event: 0,
            min_event_interval: 100, // 100ms minimum between events
            event_density: 0.6,
            last_section_id: 0,
            last_hover_id: 0,
        }
    }

    /// Set event density (0..1). Lower = fewer events.
    pub fn set_density(&mut self, density: f32) {
        self.event_density = density.clamp(0.0, 1.0);
    }

    /// Apply preset settings.
    pub fn apply_preset(&mut self, preset: Preset) {
        self.event_density = preset.event_density();
    }

    /// Apply reduced motion - significantly reduces event frequency.
    pub fn apply_reduced_motion(&mut self, reduced: bool) {
        if reduced {
            self.event_density *= 0.3;
            self.min_event_interval = 300;
        } else {
            self.min_event_interval = 100;
        }
    }

    /// Process an interaction event and generate musical events.
    pub fn process_event(
        &mut self,
        event: &InteractionEvent,
        harmony: &HarmonyManager,
    ) -> Vec<MusicEvent> {
        let mut events = Vec::new();

        match event {
            InteractionEvent::Click { x, y, .. } => {
                // Generate pluck based on position
                let velocity = 0.5 + (1.0 - *y) * 0.3; // Higher = louder
                let octave = 3 + ((*y * 2.0) as u8).min(2);
                let degree = ((*x * 5.0) as usize).min(4);
                let note = harmony.scale_note(degree, octave);

                // Salience based on velocity and position (center = more salient)
                let center_dist = ((*x - 0.5).abs() + (*y - 0.5).abs()) / 2.0;
                let salience = (1.0 - center_dist) * velocity;

                events.push(MusicEvent::Pluck {
                    note,
                    velocity,
                    salience,
                });
            }

            InteractionEvent::Nav { section_id, .. } => {
                // Section change triggers chord
                let degree = match section_id % 4 {
                    0 => ChordDegree::I,
                    1 => ChordDegree::IV,
                    2 => ChordDegree::V,
                    _ => ChordDegree::VI,
                };

                let notes = harmony.chord_notes(degree, 3);
                events.push(MusicEvent::PadChord {
                    notes,
                    velocity: 0.4,
                    salience: 0.8, // Navigation is high salience
                });
            }

            InteractionEvent::HoverStart { hover_id, .. } => {
                if *hover_id != self.last_hover_id && self.should_emit_event() {
                    // Subtle pluck on hover
                    let note = harmony.scale_note(self.rng.usize(..5), 4);
                    events.push(MusicEvent::Pluck {
                        note,
                        velocity: 0.2,
                        salience: 0.3, // Low salience for hover
                    });
                    self.last_hover_id = *hover_id;
                }
            }

            InteractionEvent::HoverEnd { .. } => {
                // Usually silent, but could trigger subtle release
            }
        }

        events
    }

    /// Update internal state (call each frame).
    pub fn update(
        &mut self,
        dt_ms: u64,
        section_id: u32,
        hover_id: u32,
        activity: f32,
        harmony: &mut HarmonyManager,
    ) -> Vec<MusicEvent> {
        self.time_since_event += dt_ms;
        let mut events = Vec::new();

        // Check for section change
        if section_id != self.last_section_id {
            let degree = match section_id % 4 {
                0 => ChordDegree::I,
                1 => ChordDegree::IV,
                2 => ChordDegree::V,
                _ => ChordDegree::VI,
            };

            let notes = harmony.chord_notes(degree, 3);
            events.push(MusicEvent::PadChord {
                notes,
                velocity: 0.5,
                salience: 0.9,
            });
            self.last_section_id = section_id;
            self.time_since_event = 0;
        }

        // Check for modulation
        if let Some((to_root, to_mode)) = harmony.update(dt_ms, activity) {
            events.push(MusicEvent::Cadence {
                to_root,
                to_mode,
                salience: 0.7,
            });
        }

        // Activity-based accent generation
        if activity > 0.7 && self.should_emit_event() && self.rng.f32() < activity * 0.1 {
            events.push(MusicEvent::Accent {
                strength: activity,
                salience: activity * 0.6,
            });
            self.time_since_event = 0;
        }

        self.last_hover_id = hover_id;
        events
    }

    /// Check if we should emit an event based on timing and density.
    fn should_emit_event(&mut self) -> bool {
        self.time_since_event > self.min_event_interval
            && self.rng.f32() < self.event_density
    }

    /// Get time since last event (for diagnostics).
    pub fn time_since_event(&self) -> u64 {
        self.time_since_event
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_click_generates_pluck() {
        let mut gen = EventGenerator::new(42);
        let harmony = HarmonyManager::new(42, Preset::Ambient);

        let event = InteractionEvent::Click {
            x: 0.5,
            y: 0.5,
            target_id: 1,
            weight: None,
        };

        let events = gen.process_event(&event, &harmony);
        assert!(!events.is_empty());
        assert!(matches!(events[0], MusicEvent::Pluck { .. }));
    }
}
