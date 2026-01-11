//! Core types for the musicalization engine.
//!
//! Defines input contracts (InteractionFrame, InteractionEvent) and
//! output contracts (OutputFrame, MusicParams, MusicEvent).

/// Continuous input sent at a fixed cadence from the host.
///
/// All position values are normalized to 0..1 range.
/// Sentinel value -1.0 indicates "no data" (e.g., pointer left viewport).
#[derive(Debug, Clone, Copy, Default)]
pub struct InteractionFrame {
    /// Timestamp in milliseconds
    pub t_ms: u64,

    /// Viewport width in pixels
    pub viewport_w: u32,
    /// Viewport height in pixels
    pub viewport_h: u32,

    /// Pointer X position (0..1), or -1.0 for "no pointer active"
    pub pointer_x: f32,
    /// Pointer Y position (0..1), or -1.0 for "no pointer active"
    pub pointer_y: f32,
    /// Pointer speed (0..1)
    pub pointer_speed: f32,

    /// Scroll Y position (0..1)
    pub scroll_y: f32,
    /// Scroll velocity (-1..1)
    pub scroll_v: f32,

    /// Opaque hover element ID (0 = no element)
    pub hover_id: u32,
    /// Current section/route index
    pub section_id: u32,

    /// Window has focus
    pub focus: bool,
    /// Browser tab is visible
    pub tab_focused: bool,
    /// User prefers reduced motion
    pub reduced_motion: bool,
}

impl InteractionFrame {
    /// Check if pointer data is valid (not sentinel value)
    pub fn has_pointer(&self) -> bool {
        self.pointer_x >= 0.0 && self.pointer_y >= 0.0
    }
}

/// Discrete input event sent immediately on occurrence.
#[derive(Debug, Clone)]
pub enum InteractionEvent {
    Click {
        x: f32,
        y: f32,
        target_id: u32,
        weight: Option<f32>,
    },
    Nav {
        section_id: u32,
        weight: Option<f32>,
    },
    HoverStart {
        hover_id: u32,
        weight: Option<f32>,
    },
    HoverEnd {
        hover_id: u32,
        weight: Option<f32>,
    },
}

/// Output from the engine containing both continuous params and discrete events.
#[derive(Debug, Clone, Default)]
pub struct OutputFrame {
    /// Smoothed continuous musical parameters
    pub params: MusicParams,
    /// Current harmonic state
    pub harmony: HarmonyState,
    /// Discrete musical events triggered this frame
    pub events: Vec<MusicEvent>,
    /// Optional diagnostic output for debugging/visualization
    pub diagnostics: Option<DiagnosticOutput>,
}

/// Continuous musical parameters (all 0..1 unless noted).
///
/// These are smoothed, bounded values suitable for direct mapping to audio parameters.
#[derive(Debug, Clone, Copy, Default)]
pub struct MusicParams {
    /// Overall intensity / master level
    pub master: f32,
    /// Harmonic richness / tonal warmth
    pub warmth: f32,
    /// Filter cutoff proxy (higher = brighter)
    pub brightness: f32,
    /// Stereo spread / width
    pub width: f32,
    /// Modulation depth / movement amount
    pub motion: f32,
    /// Spatial depth / reverb send
    pub reverb: f32,
    /// Voice or note activity level
    pub density: f32,
    /// Harmonic complexity / tension level
    pub tension: f32,
}

/// Current harmonic state.
#[derive(Debug, Clone, Copy)]
pub struct HarmonyState {
    /// Root note (0-11, where 0 = C)
    pub root: u8,
    /// Current mode/scale
    pub mode: Mode,
    /// Harmonic tension level (0..1)
    pub tension: f32,
}

impl Default for HarmonyState {
    fn default() -> Self {
        Self {
            root: 0, // C
            mode: Mode::Major,
            tension: 0.3,
        }
    }
}

/// Musical modes/scales supported by the engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Mode {
    #[default]
    Major,
    Minor,
    Dorian,
    Mixolydian,
    Lydian,
    Phrygian,
    PentatonicMajor,
    PentatonicMinor,
}

impl Mode {
    /// Get the intervals for this mode (semitones from root).
    pub fn intervals(&self) -> &'static [u8] {
        match self {
            Mode::Major => &[0, 2, 4, 5, 7, 9, 11],
            Mode::Minor => &[0, 2, 3, 5, 7, 8, 10],
            Mode::Dorian => &[0, 2, 3, 5, 7, 9, 10],
            Mode::Mixolydian => &[0, 2, 4, 5, 7, 9, 10],
            Mode::Lydian => &[0, 2, 4, 6, 7, 9, 11],
            Mode::Phrygian => &[0, 1, 3, 5, 7, 8, 10],
            Mode::PentatonicMajor => &[0, 2, 4, 7, 9],
            Mode::PentatonicMinor => &[0, 3, 5, 7, 10],
        }
    }

    /// Parse mode from string name.
    pub fn from_name(name: &str) -> Option<Self> {
        match name.to_lowercase().as_str() {
            "major" => Some(Mode::Major),
            "minor" => Some(Mode::Minor),
            "dorian" => Some(Mode::Dorian),
            "mixolydian" => Some(Mode::Mixolydian),
            "lydian" => Some(Mode::Lydian),
            "phrygian" => Some(Mode::Phrygian),
            "pentatonic_major" | "pentatonic major" => Some(Mode::PentatonicMajor),
            "pentatonic_minor" | "pentatonic minor" => Some(Mode::PentatonicMinor),
            _ => None,
        }
    }
}

/// Discrete musical events triggered by interactions.
///
/// All events include a `salience` field (0..1) indicating importance.
/// The host decides how to interpret salience (filter, scale velocity, ignore).
#[derive(Debug, Clone)]
pub enum MusicEvent {
    /// Short melodic gesture (click, tap)
    Pluck {
        note: u8,
        velocity: f32,
        salience: f32,
    },
    /// Sustained harmonic bed (section change, idle)
    PadChord {
        notes: Vec<u8>,
        velocity: f32,
        salience: f32,
    },
    /// Key/mode transition marker
    Cadence {
        to_root: u8,
        to_mode: Mode,
        salience: f32,
    },
    /// Rhythmic emphasis without pitch
    Accent {
        strength: f32,
        salience: f32,
    },
    /// Fade out / silence trigger
    Mute {
        on: bool,
        salience: f32,
    },
}

impl MusicEvent {
    /// Get the salience value for this event.
    pub fn salience(&self) -> f32 {
        match self {
            MusicEvent::Pluck { salience, .. } => *salience,
            MusicEvent::PadChord { salience, .. } => *salience,
            MusicEvent::Cadence { salience, .. } => *salience,
            MusicEvent::Accent { salience, .. } => *salience,
            MusicEvent::Mute { salience, .. } => *salience,
        }
    }
}

/// Diagnostic output for debugging and visualization.
///
/// Intended for debugging, visualization, or educational overlays.
#[derive(Debug, Clone, Default)]
pub struct DiagnosticOutput {
    /// Current key (0-11, where 0 = C)
    pub key: u8,
    /// Current mode as numeric value
    pub mode: u8,
    /// Current chord degree (0-6 for I-VII)
    pub chord: u8,
    /// Raw (unsmoothed) activity value
    pub raw_activity: f32,
    /// Current smoothing attack coefficient
    pub smoothing_attack: f32,
    /// Current smoothing release coefficient
    pub smoothing_release: f32,
    /// Pending modulation target (if any)
    pub pending_modulation: Option<(u8, Mode)>,
    /// Time since last event (ms)
    pub time_since_event: u64,
}
