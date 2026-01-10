//! WASM bindings for sonic-ux musicalization engine.
//!
//! This crate provides JavaScript-friendly bindings via wasm-bindgen.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use sonic_ux_core::{
    Engine as CoreEngine, InteractionEvent as CoreInteractionEvent,
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
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsMusicParams {
    pub cutoff: f32,
    pub warmth: f32,
    pub stereo_width: f32,
    pub reverb: f32,
    pub activity: f32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsHarmonyState {
    pub root: u8,
    pub mode: String,
    pub tension: f32,
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
            cutoff: output.params.cutoff,
            warmth: output.params.warmth,
            stereo_width: output.params.stereo_width,
            reverb: output.params.reverb,
            activity: output.params.activity,
        },
        harmony: JsHarmonyState {
            root: output.harmony.root,
            mode: mode_to_string(output.harmony.mode),
            tension: output.harmony.tension,
        },
        events: output.events.into_iter().map(convert_event).collect(),
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

/// The WASM-bindgen engine wrapper.
#[wasm_bindgen]
pub struct SonicEngine {
    inner: CoreEngine,
}

#[wasm_bindgen]
impl SonicEngine {
    /// Create a new engine with the given seed and preset name.
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
    #[wasm_bindgen]
    pub fn update(&mut self, frame: JsValue) -> Result<JsValue, JsError> {
        let frame: InteractionFrame = serde_wasm_bindgen::from_value(frame)?;
        let output = self.inner.update(frame.into());
        let js_output = convert_output(output);
        Ok(serde_wasm_bindgen::to_value(&js_output)?)
    }

    /// Process a discrete interaction event.
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

    /// Set the current section.
    #[wasm_bindgen]
    pub fn set_section(&mut self, section_id: u32) {
        self.inner.set_section(section_id);
    }

    /// Enable or disable the engine.
    #[wasm_bindgen]
    pub fn set_enabled(&mut self, enabled: bool) {
        self.inner.set_enabled(enabled);
    }

    /// Set harmony preset by name.
    #[wasm_bindgen]
    pub fn set_preset(&mut self, name: &str) -> Result<(), JsError> {
        let preset = Preset::from_name(name)
            .ok_or_else(|| JsError::new(&format!("Unknown preset: {}", name)))?;
        self.inner.set_preset(preset);
        Ok(())
    }

    /// Set scale by root note name and mode name.
    #[wasm_bindgen]
    pub fn set_scale(&mut self, root: &str, mode: &str) -> Result<(), JsError> {
        let root_num = note_name_to_num(root)
            .ok_or_else(|| JsError::new(&format!("Unknown note: {}", root)))?;
        let mode = Mode::from_name(mode)
            .ok_or_else(|| JsError::new(&format!("Unknown mode: {}", mode)))?;
        self.inner.set_scale(root_num, mode);
        Ok(())
    }

    /// Set modulation rate (0..1).
    #[wasm_bindgen]
    pub fn set_modulation_rate(&mut self, rate: f32) {
        self.inner.set_modulation_rate(rate);
    }
}

/// Convert note name to MIDI-style number (C=0, C#=1, etc.)
fn note_name_to_num(name: &str) -> Option<u8> {
    let name = name.to_uppercase();
    let base = match name.chars().next()? {
        'C' => 0,
        'D' => 2,
        'E' => 4,
        'F' => 5,
        'G' => 7,
        'A' => 9,
        'B' => 11,
        _ => return None,
    };

    let modifier = if name.contains('#') || name.contains('♯') {
        1
    } else if name.contains('B') && name.len() > 1 || name.contains('♭') {
        -1_i8
    } else {
        0
    };

    Some(((base as i8 + modifier) % 12) as u8)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_note_name_to_num() {
        assert_eq!(note_name_to_num("C"), Some(0));
        assert_eq!(note_name_to_num("C#"), Some(1));
        assert_eq!(note_name_to_num("D"), Some(2));
        assert_eq!(note_name_to_num("A"), Some(9));
    }
}
