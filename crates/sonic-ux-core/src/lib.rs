//! # sonic-ux-core
//!
//! Core musicalization engine that transforms UI interactions into musical parameters and events.
//!
//! This crate provides the musical intelligence layer - it receives interaction data
//! (mouse position, scroll, clicks) and outputs smoothed musical parameters and discrete
//! musical events that can drive any audio synthesis layer.
//!
//! ## Architecture
//!
//! ```text
//! InteractionFrame/Event → Engine → OutputFrame (params + events)
//! ```
//!
//! The engine is intentionally decoupled from audio synthesis. It outputs:
//! - **MusicParams**: Continuous parameters (cutoff, warmth, stereo width, tension)
//! - **MusicEvent**: Discrete events (pluck, padChord, cadence, accent, mute)
//!
//! ## Example
//!
//! ```
//! use sonic_ux_core::{Engine, InteractionFrame, Preset};
//!
//! let mut engine = Engine::new(42, Preset::Ambient);
//!
//! let frame = InteractionFrame {
//!     t_ms: 0,
//!     pointer_x: 0.5,
//!     pointer_y: 0.5,
//!     pointer_speed: 0.0,
//!     pointer_down: false,
//!     scroll_y: 0.0,
//!     scroll_v: 0.0,
//!     hover_id: 0,
//!     section_id: 0,
//!     focus: true,
//!     tab_focused: true,
//!     reduced_motion: false,
//!     viewport_w: 1920,
//!     viewport_h: 1080,
//! };
//!
//! let output = engine.update(frame);
//! // Use output.params and output.events
//! ```

mod types;
mod engine;
pub mod harmony;
mod smoothing;
mod events;

pub use types::*;
pub use engine::Engine;
pub use harmony::Preset;
