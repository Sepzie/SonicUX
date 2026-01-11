//! Main engine that orchestrates all components.

use crate::events::EventGenerator;
use crate::harmony::{ChordDegree, HarmonyManager, Preset};
use crate::smoothing::{DecayingValue, ParamSmoother};
use crate::types::{
    DiagnosticOutput, HarmonyState, HoldState, InteractionEvent, InteractionFrame, Mode,
    MusicEvent, MusicParams, OutputFrame,
};

/// The main musicalization engine.
///
/// Receives interaction data and produces musical parameters and events.
#[derive(Debug)]
pub struct Engine {
    /// Parameter smoother
    smoother: ParamSmoother,
    /// Harmony manager
    harmony: HarmonyManager,
    /// Event generator
    events: EventGenerator,

    /// Decaying pointer X (handles sentinel values)
    pointer_x: DecayingValue,
    /// Decaying pointer Y (handles sentinel values)
    pointer_y: DecayingValue,

    /// Last frame timestamp
    last_t_ms: u64,
    /// Current reduced motion state
    reduced_motion: bool,
    /// Engine enabled state
    enabled: bool,
    /// Whether to include diagnostics in output
    diagnostics_enabled: bool,
    /// Current chord degree (for diagnostics)
    current_chord: u8,
    /// Raw activity before smoothing (for diagnostics)
    raw_activity: f32,
    /// Decaying click energy for tension mapping
    click_energy: f32,
    /// Current hold note (for click-and-hold)
    hold_note: Option<u8>,
}

impl Engine {
    /// Create a new engine with the given seed and preset.
    pub fn new(seed: u64, preset: Preset) -> Self {
        let mut events = EventGenerator::new(seed);
        events.apply_preset(preset);

        Self {
            smoother: ParamSmoother::new(),
            harmony: HarmonyManager::new(seed, preset),
            events,
            pointer_x: DecayingValue::new(0.5, 0.02),
            pointer_y: DecayingValue::new(0.5, 0.02),
            last_t_ms: 0,
            reduced_motion: false,
            enabled: true,
            diagnostics_enabled: false,
            current_chord: 0,
            raw_activity: 0.0,
            click_energy: 0.0,
            hold_note: None,
        }
    }

    /// Enable or disable diagnostic output.
    pub fn set_diagnostics(&mut self, enabled: bool) {
        self.diagnostics_enabled = enabled;
    }

    /// Process an interaction frame and return musical output.
    pub fn update(&mut self, frame: InteractionFrame) -> OutputFrame {
        if !self.enabled {
            return OutputFrame::default();
        }

        // Calculate delta time
        let dt_ms = if self.last_t_ms == 0 {
            16 // Assume ~60fps for first frame
        } else {
            frame.t_ms.saturating_sub(self.last_t_ms)
        };
        self.last_t_ms = frame.t_ms;
        self.decay_click_energy(dt_ms);

        // Handle reduced motion changes
        if frame.reduced_motion != self.reduced_motion {
            self.reduced_motion = frame.reduced_motion;
            if self.reduced_motion {
                self.smoother.apply_reduced_motion();
                self.events.apply_reduced_motion(true);
            } else {
                self.smoother.apply_normal_motion();
                self.events.apply_reduced_motion(false);
            }
        }

        // Update decaying values (handles sentinel -1 values)
        self.pointer_x.update(frame.pointer_x);
        self.pointer_y.update(frame.pointer_y);

        // Calculate activity from inputs
        self.raw_activity = self.calculate_activity(&frame);

        // Map activity to parameters
        self.update_params(&frame, self.raw_activity);

        // Update smoother
        self.smoother.update();

        // Generate events
        let mut events = self.events.update(
            dt_ms,
            frame.section_id,
            frame.hover_id,
            self.raw_activity,
            &mut self.harmony,
        );

        // Handle mute on tab unfocus
        if !frame.tab_focused && frame.focus {
            events.push(MusicEvent::Mute {
                on: true,
                salience: 1.0,
            });
        }

        let hold = self.compute_hold(&frame);

        // Build diagnostics if enabled
        let diagnostics = if self.diagnostics_enabled {
            let state = self.harmony.state();
            Some(DiagnosticOutput {
                key: state.root,
                mode: mode_to_num(state.mode),
                chord: self.current_chord,
                raw_activity: self.raw_activity,
                smoothing_attack: self.smoother.attack(),
                smoothing_release: self.smoother.release(),
                pending_modulation: None,
                time_since_event: self.events.time_since_event(),
            })
        } else {
            None
        };

        OutputFrame {
            params: MusicParams {
                master: self.smoother.master.value(),
                warmth: self.smoother.warmth.value(),
                brightness: self.smoother.brightness.value(),
                width: self.smoother.width.value(),
                motion: self.smoother.motion.value(),
                reverb: self.smoother.reverb.value(),
                density: self.smoother.density.value(),
                tension: self.smoother.tension.value(),
            },
            harmony: self.harmony.state(),
            events,
            hold,
            diagnostics,
        }
    }

    /// Process a discrete interaction event.
    pub fn event(&mut self, event: InteractionEvent) -> Vec<MusicEvent> {
        if !self.enabled {
            return Vec::new();
        }
        if let InteractionEvent::Click { y, weight, .. } = event {
            let weight = weight.unwrap_or(1.0).clamp(0.0, 1.0);
            let intensity = (0.6 + weight * 0.4 + y * 0.1).clamp(0.0, 1.0);
            self.click_energy = self.click_energy.max(intensity);
        }
        self.events.process_event(&event, &self.harmony)
    }

    /// Set the current section (for navigation events).
    pub fn set_section(&mut self, section_id: u32) {
        let event = InteractionEvent::Nav {
            section_id,
            weight: None,
        };
        self.event(event);
    }

    /// Enable or disable the engine.
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    /// Check if engine is enabled.
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Set harmony preset.
    pub fn set_preset(&mut self, preset: Preset) {
        self.harmony.set_preset(preset);
        self.events.apply_preset(preset);
    }

    /// Set scale directly.
    pub fn set_scale(&mut self, root: u8, mode: Mode) {
        self.harmony.set_scale(root, mode);
    }

    /// Set chord pool.
    pub fn set_chord_pool(&mut self, chords: Vec<ChordDegree>) {
        self.harmony.set_chord_pool(chords);
    }

    /// Set modulation rate.
    pub fn set_modulation_rate(&mut self, rate: f32) {
        self.harmony.set_modulation_rate(rate);
    }

    /// Get current harmony state.
    pub fn harmony_state(&self) -> HarmonyState {
        self.harmony.state()
    }

    /// Get current preset.
    pub fn preset(&self) -> Preset {
        self.harmony.preset()
    }

    /// Calculate overall activity level from input frame.
    fn calculate_activity(&self, frame: &InteractionFrame) -> f32 {
        let pointer_activity = frame.pointer_speed;
        let scroll_activity = frame.scroll_v.abs();

        // Weighted combination
        let raw = pointer_activity * 0.6 + scroll_activity * 0.4;

        // Reduce if not focused
        let focus_mult = if frame.focus { 1.0 } else { 0.3 };

        (raw * focus_mult).clamp(0.0, 1.0)
    }

    fn decay_click_energy(&mut self, dt_ms: u64) {
        let decay = (-(dt_ms as f32) / 450.0).exp();
        self.click_energy *= decay;
    }

    fn compute_hold(&mut self, frame: &InteractionFrame) -> Option<HoldState> {
        if !frame.pointer_down {
            self.hold_note = None;
            return None;
        }

        let pointer_x = if frame.has_pointer() {
            frame.pointer_x
        } else {
            self.pointer_x.value()
        };
        let pointer_y = if frame.has_pointer() {
            frame.pointer_y
        } else {
            self.pointer_y.value()
        };
        let degree_count = self.harmony.state().mode.intervals().len().max(1);
        let degree = ((pointer_x.clamp(0.0, 0.9999)) * degree_count as f32) as usize;
        let note = self.harmony.scale_note(degree, 4);
        self.hold_note = Some(note);

        let velocity = (0.35 + pointer_y.clamp(0.0, 1.0) * 0.65).clamp(0.2, 1.0);
        Some(HoldState { note, velocity })
    }

    /// Update parameter targets based on input.
    fn update_params(&mut self, frame: &InteractionFrame, activity: f32) {
        // Map pointer position to stereo width
        let width = if frame.has_pointer() {
            (frame.pointer_x - 0.5).abs() * 2.0
        } else {
            (self.pointer_x.value() - 0.5).abs() * 2.0
        };

        // Map pointer position to brightness
        let pointer_y = if frame.has_pointer() {
            frame.pointer_y
        } else {
            self.pointer_y.value()
        };
        let brightness = pointer_y.clamp(0.0, 1.0);

        // Map activity to various params
        let master = 0.55 + activity * 0.45; // 0.55-1.0 range
        let hover_boost = if frame.hover_id > 0 { 0.2 } else { 0.0 };
        let warmth = (0.3 + frame.pointer_speed * 0.5 + hover_boost).clamp(0.0, 1.0);
        let motion = activity * 0.6; // More activity = more modulation
        let scroll_energy = frame.scroll_v.abs().clamp(0.0, 1.0);
        let reduced_boost = if frame.reduced_motion { 0.2 } else { 0.0 };
        let reverb = (0.2 + scroll_energy * 0.6 + reduced_boost).clamp(0.0, 1.0);
        let density = activity; // Direct mapping
        let scroll_spike = ((scroll_energy - 0.4) / 0.6).clamp(0.0, 1.0);
        let tension = (self.harmony.state().tension * 0.35
            + scroll_spike * 0.35
            + self.click_energy * 0.4)
            .clamp(0.0, 1.0);

        self.smoother.master.set_target(master);
        self.smoother.warmth.set_target(warmth);
        self.smoother.brightness.set_target(brightness);
        self.smoother.width.set_target(width);
        self.smoother.motion.set_target(motion);
        self.smoother.reverb.set_target(reverb);
        self.smoother.density.set_target(density);
        self.smoother.tension.set_target(tension);
    }
}

impl Default for Engine {
    fn default() -> Self {
        Self::new(42, Preset::Ambient)
    }
}

/// Convert Mode enum to numeric value for diagnostics.
fn mode_to_num(mode: Mode) -> u8 {
    match mode {
        Mode::Major => 0,
        Mode::Minor => 1,
        Mode::Dorian => 2,
        Mode::Mixolydian => 3,
        Mode::Lydian => 4,
        Mode::Phrygian => 5,
        Mode::PentatonicMajor => 6,
        Mode::PentatonicMinor => 7,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_creation() {
        let engine = Engine::new(42, Preset::Ambient);
        assert!(engine.is_enabled());
        assert_eq!(engine.preset(), Preset::Ambient);
    }

    #[test]
    fn test_engine_update() {
        let mut engine = Engine::new(42, Preset::Ambient);
        let frame = InteractionFrame {
            t_ms: 16,
            pointer_x: 0.5,
            pointer_y: 0.5,
            pointer_speed: 0.1,
            pointer_down: false,
            scroll_y: 0.0,
            scroll_v: 0.0,
            hover_id: 0,
            section_id: 0,
            focus: true,
            tab_focused: true,
            reduced_motion: false,
            viewport_w: 1920,
            viewport_h: 1080,
        };

        let output = engine.update(frame);
        assert!(output.params.brightness >= 0.0 && output.params.brightness <= 1.0);
        assert!(output.params.master >= 0.0 && output.params.master <= 1.0);
    }

    #[test]
    fn test_engine_disabled() {
        let mut engine = Engine::new(42, Preset::Ambient);
        engine.set_enabled(false);

        let frame = InteractionFrame::default();
        let output = engine.update(frame);

        assert!(output.events.is_empty());
    }

    #[test]
    fn test_engine_diagnostics() {
        let mut engine = Engine::new(42, Preset::Ambient);
        engine.set_diagnostics(true);

        let frame = InteractionFrame {
            t_ms: 16,
            pointer_x: 0.5,
            pointer_y: 0.5,
            pointer_speed: 0.5,
            pointer_down: false,
            scroll_y: 0.0,
            scroll_v: 0.0,
            hover_id: 0,
            section_id: 0,
            focus: true,
            tab_focused: true,
            reduced_motion: false,
            viewport_w: 1920,
            viewport_h: 1080,
        };

        let output = engine.update(frame);
        assert!(output.diagnostics.is_some());
        let diag = output.diagnostics.unwrap();
        assert!(diag.raw_activity > 0.0);
    }

    #[test]
    fn test_reduced_motion() {
        let mut engine = Engine::new(42, Preset::Ambient);

        let frame = InteractionFrame {
            t_ms: 16,
            reduced_motion: true,
            pointer_down: false,
            focus: true,
            tab_focused: true,
            ..Default::default()
        };

        let _output = engine.update(frame);
        // Reduced motion should apply slower smoothing
        assert!(engine.reduced_motion);
    }

    #[test]
    fn test_preset_change() {
        let mut engine = Engine::new(42, Preset::Ambient);
        assert_eq!(engine.preset(), Preset::Ambient);

        engine.set_preset(Preset::Dramatic);
        assert_eq!(engine.preset(), Preset::Dramatic);
    }

    #[test]
    fn test_scale_change() {
        let mut engine = Engine::new(42, Preset::Ambient);

        engine.set_scale(9, Mode::Minor); // A minor
        let state = engine.harmony_state();
        assert_eq!(state.root, 9);
        assert_eq!(state.mode, Mode::Minor);
    }
}
