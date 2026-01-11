//! WASM bindings for sonic-ux musicalization engine.
//!
//! This crate provides JavaScript-friendly bindings via wasm-bindgen.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use sonic_ux_core::{
    harmony::ChordDegree, Engine as CoreEngine, InteractionEvent as CoreInteractionEvent,
    InteractionFrame as CoreInteractionFrame, Mode, MusicEvent as CoreMusicEvent,
    OutputFrame as CoreOutputFrame, Preset,
};

/// WASM-compatible interaction frame.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InteractionFrame {
    pub t_ms: u64,
    pub viewport_w: u32,
    pub viewport_h: u32,
    pub pointer_x: f32,
    pub pointer_y: f32,
    pub pointer_speed: f32,
    pub pointer_down: u8,
    pub scroll_y: f32,
    pub scroll_v: f32,
    pub hover_id: u32,
    pub section_id: u32,
    pub focus: u8,
    pub tab_focused: u8,
    pub reduced_motion: u8,
}

impl From<InteractionFrame> for CoreInteractionFrame {
    fn from(f: InteractionFrame) -> Self {
        CoreInteractionFrame {
            t_ms: f.t_ms,
            viewport_w: f.viewport_w,
            viewport_h: f.viewport_h,
            pointer_x: f.pointer_x,
            pointer_y: f.pointer_y,
            pointer_speed: f.pointer_speed,
            pointer_down: f.pointer_down != 0,
            scroll_y: f.scroll_y,
            scroll_v: f.scroll_v,
            hover_id: f.hover_id,
            section_id: f.section_id,
            focus: f.focus != 0,
            tab_focused: f.tab_focused != 0,
            reduced_motion: f.reduced_motion != 0,
        }
    }
}

/// WASM-compatible interaction event.
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum InteractionEvent {
    #[serde(rename_all = "camelCase")]
    Click {
        x: f32,
        y: f32,
        target_id: u32,
        #[serde(skip_serializing_if = "Option::is_none")]
        weight: Option<f32>,
    },
    #[serde(rename_all = "camelCase")]
    Nav {
        section_id: u32,
        #[serde(skip_serializing_if = "Option::is_none")]
        weight: Option<f32>,
    },
    #[serde(rename_all = "camelCase")]
    HoverStart {
        hover_id: u32,
        #[serde(skip_serializing_if = "Option::is_none")]
        weight: Option<f32>,
    },
    #[serde(rename_all = "camelCase")]
    HoverEnd {
        hover_id: u32,
        #[serde(skip_serializing_if = "Option::is_none")]
        weight: Option<f32>,
    },
}

impl From<InteractionEvent> for CoreInteractionEvent {
    fn from(e: InteractionEvent) -> Self {
        match e {
            InteractionEvent::Click {
                x,
                y,
                target_id,
                weight,
            } => CoreInteractionEvent::Click {
                x,
                y,
                target_id,
                weight,
            },
            InteractionEvent::Nav { section_id, weight } => {
                CoreInteractionEvent::Nav { section_id, weight }
            }
            InteractionEvent::HoverStart { hover_id, weight } => {
                CoreInteractionEvent::HoverStart { hover_id, weight }
            }
            InteractionEvent::HoverEnd { hover_id, weight } => {
                CoreInteractionEvent::HoverEnd { hover_id, weight }
            }
        }
    }
}

/// WASM-compatible output frame.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsOutputFrame {
    pub params: JsMusicParams,
    pub harmony: JsHarmonyState,
    pub events: Vec<JsMusicEvent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hold: Option<JsHoldState>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diagnostics: Option<JsDiagnostics>,
}

/// Music parameters matching the PRD spec.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsMusicParams {
    /// Overall intensity / master level (0..1)
    pub master: f32,
    /// Harmonic richness / tonal warmth (0..1)
    pub warmth: f32,
    /// Filter cutoff proxy (0..1, higher = brighter)
    pub brightness: f32,
    /// Stereo spread / width (0..1)
    pub width: f32,
    /// Modulation depth / movement amount (0..1)
    pub motion: f32,
    /// Spatial depth / reverb send (0..1)
    pub reverb: f32,
    /// Voice or note activity level (0..1)
    pub density: f32,
    /// Harmonic complexity / tension level (0..1)
    pub tension: f32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsHarmonyState {
    pub root: u8,
    pub mode: String,
    pub tension: f32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsHoldState {
    pub note: u8,
    pub vel: f32,
}

/// Diagnostic output for debugging/visualization.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsDiagnostics {
    pub key: u8,
    pub mode: u8,
    pub chord: u8,
    pub raw_activity: f32,
    pub smoothing_attack: f32,
    pub smoothing_release: f32,
    pub time_since_event: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum JsMusicEvent {
    #[serde(rename_all = "camelCase")]
    Pluck {
        note: u8,
        vel: f32,
        salience: f32,
    },
    #[serde(rename_all = "camelCase")]
    PadChord {
        notes: Vec<u8>,
        vel: f32,
        salience: f32,
    },
    #[serde(rename_all = "camelCase")]
    Cadence {
        to_key: u8,
        mode: String,
        salience: f32,
    },
    #[serde(rename_all = "camelCase")]
    Accent { strength: f32, salience: f32 },
    #[serde(rename_all = "camelCase")]
    Mute { on: bool, salience: f32 },
}

fn mode_to_string(mode: Mode) -> String {
    match mode {
        Mode::Major => "major".to_string(),
        Mode::Minor => "minor".to_string(),
        Mode::Dorian => "dorian".to_string(),
        Mode::Mixolydian => "mixolydian".to_string(),
        Mode::Lydian => "lydian".to_string(),
        Mode::Phrygian => "phrygian".to_string(),
        Mode::PentatonicMajor => "pentatonic_major".to_string(),
        Mode::PentatonicMinor => "pentatonic_minor".to_string(),
    }
}

fn convert_output(output: CoreOutputFrame) -> JsOutputFrame {
    JsOutputFrame {
        params: JsMusicParams {
            master: output.params.master,
            warmth: output.params.warmth,
            brightness: output.params.brightness,
            width: output.params.width,
            motion: output.params.motion,
            reverb: output.params.reverb,
            density: output.params.density,
            tension: output.params.tension,
        },
        harmony: JsHarmonyState {
            root: output.harmony.root,
            mode: mode_to_string(output.harmony.mode),
            tension: output.harmony.tension,
        },
        events: output.events.into_iter().map(convert_event).collect(),
        hold: output.hold.map(|hold| JsHoldState {
            note: hold.note,
            vel: hold.velocity,
        }),
        diagnostics: output.diagnostics.map(|d| JsDiagnostics {
            key: d.key,
            mode: d.mode,
            chord: d.chord,
            raw_activity: d.raw_activity,
            smoothing_attack: d.smoothing_attack,
            smoothing_release: d.smoothing_release,
            time_since_event: d.time_since_event,
        }),
    }
}

fn convert_event(event: CoreMusicEvent) -> JsMusicEvent {
    match event {
        CoreMusicEvent::Pluck {
            note,
            velocity,
            salience,
        } => JsMusicEvent::Pluck {
            note,
            vel: velocity,
            salience,
        },
        CoreMusicEvent::PadChord {
            notes,
            velocity,
            salience,
        } => JsMusicEvent::PadChord {
            notes,
            vel: velocity,
            salience,
        },
        CoreMusicEvent::Cadence {
            to_root,
            to_mode,
            salience,
        } => JsMusicEvent::Cadence {
            to_key: to_root,
            mode: mode_to_string(to_mode),
            salience,
        },
        CoreMusicEvent::Accent { strength, salience } => {
            JsMusicEvent::Accent { strength, salience }
        }
        CoreMusicEvent::Mute { on, salience } => JsMusicEvent::Mute { on, salience },
    }
}

/// Parse chord degree from string (e.g., "I", "IV", "vi").
fn parse_chord_degree(s: &str) -> Option<ChordDegree> {
    match s.to_uppercase().as_str() {
        "I" => Some(ChordDegree::I),
        "II" => Some(ChordDegree::II),
        "III" => Some(ChordDegree::III),
        "IV" => Some(ChordDegree::IV),
        "V" => Some(ChordDegree::V),
        "VI" => Some(ChordDegree::VI),
        "VII" => Some(ChordDegree::VII),
        _ => None,
    }
}

/// The WASM-bindgen engine wrapper.
#[wasm_bindgen]
pub struct SonicEngine {
    inner: CoreEngine,
}

#[wasm_bindgen]
impl SonicEngine {
    /// Create a new engine with the given seed and preset name.
    ///
    /// Available presets: "ambient" (default), "minimal", "dramatic", "playful"
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u64, preset: Option<String>) -> Self {
        let preset = preset
            .and_then(|s| Preset::from_name(&s))
            .unwrap_or(Preset::Ambient);

        Self {
            inner: CoreEngine::new(seed, preset),
        }
    }

    /// Process an interaction frame and return musical output.
    ///
    /// The frame should contain all current interaction state.
    /// Returns an OutputFrame with params, harmony, and events.
    #[wasm_bindgen]
    pub fn update(&mut self, frame: JsValue) -> Result<JsValue, JsError> {
        let frame: InteractionFrame = serde_wasm_bindgen::from_value(frame)?;
        let output = self.inner.update(frame.into());
        let js_output = convert_output(output);
        Ok(serde_wasm_bindgen::to_value(&js_output)?)
    }

    /// Process a discrete interaction event.
    ///
    /// Events are things like clicks, navigation, hover start/end.
    /// Returns an array of MusicEvents triggered by this interaction.
    #[wasm_bindgen]
    pub fn event(&mut self, event: JsValue) -> Result<JsValue, JsError> {
        let event: InteractionEvent = serde_wasm_bindgen::from_value(event)?;
        let events: Vec<JsMusicEvent> = self
            .inner
            .event(event.into())
            .into_iter()
            .map(convert_event)
            .collect();
        Ok(serde_wasm_bindgen::to_value(&events)?)
    }

    /// Set the current section/route.
    ///
    /// This triggers navigation-related musical events.
    #[wasm_bindgen]
    pub fn set_section(&mut self, section_id: u32) {
        self.inner.set_section(section_id);
    }

    /// Enable or disable the engine.
    ///
    /// When disabled, update() returns empty output.
    #[wasm_bindgen]
    pub fn set_enabled(&mut self, enabled: bool) {
        self.inner.set_enabled(enabled);
    }

    /// Enable or disable diagnostic output.
    ///
    /// When enabled, the output frame includes a diagnostics object.
    #[wasm_bindgen]
    pub fn set_diagnostics(&mut self, enabled: bool) {
        self.inner.set_diagnostics(enabled);
    }

    /// Set harmony preset by name.
    ///
    /// Available presets: "ambient", "minimal", "dramatic", "playful"
    #[wasm_bindgen]
    pub fn set_preset(&mut self, name: &str) -> Result<(), JsError> {
        let preset = Preset::from_name(name)
            .ok_or_else(|| JsError::new(&format!("Unknown preset: {}", name)))?;
        self.inner.set_preset(preset);
        Ok(())
    }

    /// Set scale by root note name and mode name.
    ///
    /// Root: "C", "C#", "D", etc.
    /// Mode: "major", "minor", "dorian", "lydian", "mixolydian", "phrygian",
    ///       "pentatonic_major", "pentatonic_minor"
    #[wasm_bindgen]
    pub fn set_scale(&mut self, root: &str, mode: &str) -> Result<(), JsError> {
        let root_num = note_name_to_num(root)
            .ok_or_else(|| JsError::new(&format!("Unknown note: {}", root)))?;
        let mode = Mode::from_name(mode)
            .ok_or_else(|| JsError::new(&format!("Unknown mode: {}", mode)))?;
        self.inner.set_scale(root_num, mode);
        Ok(())
    }

    /// Set the available chord pool.
    ///
    /// Chords should be Roman numerals: ["I", "IV", "V", "vi"]
    #[wasm_bindgen]
    pub fn set_chord_pool(&mut self, chords: JsValue) -> Result<(), JsError> {
        let chord_strings: Vec<String> = serde_wasm_bindgen::from_value(chords)?;
        let degrees: Result<Vec<ChordDegree>, _> = chord_strings
            .iter()
            .map(|s| {
                parse_chord_degree(s)
                    .ok_or_else(|| JsError::new(&format!("Unknown chord: {}", s)))
            })
            .collect();
        self.inner.set_chord_pool(degrees?);
        Ok(())
    }

    /// Set modulation rate (0..1).
    ///
    /// Higher values mean more frequent key changes.
    #[wasm_bindgen]
    pub fn set_modulation_rate(&mut self, rate: f32) {
        self.inner.set_modulation_rate(rate);
    }
}

/// Convert note name to MIDI-style number (C=0, C#=1, etc.)
fn note_name_to_num(name: &str) -> Option<u8> {
    let chars: Vec<char> = name.chars().collect();
    if chars.is_empty() {
        return None;
    }

    let base = match chars[0].to_ascii_uppercase() {
        'C' => 0,
        'D' => 2,
        'E' => 4,
        'F' => 5,
        'G' => 7,
        'A' => 9,
        'B' => 11,
        _ => return None,
    };

    // Check for sharp or flat modifier after the note letter
    let modifier = if chars.len() > 1 {
        match chars[1] {
            '#' | '♯' => 1,
            'b' | '♭' => -1_i8,
            _ => 0,
        }
    } else {
        0
    };

    Some(((base as i8 + modifier).rem_euclid(12)) as u8)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_note_name_to_num() {
        assert_eq!(note_name_to_num("C"), Some(0));
        assert_eq!(note_name_to_num("C#"), Some(1));
        assert_eq!(note_name_to_num("D"), Some(2));
        assert_eq!(note_name_to_num("Db"), Some(1));
        assert_eq!(note_name_to_num("A"), Some(9));
        assert_eq!(note_name_to_num("Bb"), Some(10));
    }

    #[test]
    fn test_parse_chord_degree() {
        assert_eq!(parse_chord_degree("I"), Some(ChordDegree::I));
        assert_eq!(parse_chord_degree("iv"), Some(ChordDegree::IV));
        assert_eq!(parse_chord_degree("VI"), Some(ChordDegree::VI));
    }
}
