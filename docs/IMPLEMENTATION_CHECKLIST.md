# SonicUX Implementation Checklist

This document tracks the implementation progress of the SonicUX musicalization engine.

## Legend

- [ ] Not started
- [~] In progress
- [x] Completed

---

## Phase 1: Foundation

### Project Structure

- [x] Workspace Cargo.toml setup
- [x] `sonic-ux-core` crate skeleton
- [x] `sonic-ux-wasm` crate skeleton
- [x] Move docs to `docs/` folder

### Core Types (`types.rs`)

- [x] `InteractionFrame` struct with all fields
- [x] `InteractionEvent` enum (Click, Nav, HoverStart, HoverEnd)
- [x] `OutputFrame` struct with diagnostics
- [x] `MusicParams` struct (master, warmth, brightness, width, motion, reverb, density, tension)
- [x] `MusicEvent` enum with salience field
- [x] `HarmonyState` struct
- [x] `Mode` enum with intervals
- [x] `DiagnosticOutput` struct
- [x] Unit tests for type conversions

### Smoothing (`smoothing.rs`)

- [x] `SmoothedParam` with attack/release
- [x] `ParamSmoother` for all 8 params
- [x] `DecayingValue` for sentinel handling
- [x] Reduced motion profile application
- [ ] Configurable smoothing profiles (deferred to post-v1)
- [x] Unit tests for convergence behavior

### Harmony (`harmony.rs`)

- [x] `Preset` enum (Ambient, Minimal, Dramatic, Playful)
- [x] `HarmonyManager` structure
- [x] Scale/mode support (8 modes)
- [x] Chord generation from degrees
- [x] Modulation logic
- [x] Chord pool customization
- [x] `ChordDegree` enum
- [x] Unit tests for scale generation

### Events (`events.rs`)

- [x] `EventGenerator` structure
- [x] Click → Pluck mapping
- [x] Nav → PadChord mapping
- [x] HoverStart → subtle pluck
- [x] Activity-based accents
- [x] Density control
- [x] Salience calculation
- [x] Mute event on tab unfocus
- [x] `time_since_event()` getter
- [x] Unit tests for event generation

### Engine (`engine.rs`)

- [x] `Engine` struct with all components
- [x] `update()` method
- [x] `event()` method
- [x] `set_preset()`, `set_scale()`, `set_modulation_rate()`
- [x] `set_chord_pool()`
- [x] `set_diagnostics()`
- [x] Reduced motion handling
- [x] Tab focus handling
- [x] Diagnostic output
- [x] Unit tests for engine behavior

---

## Phase 2: WASM Bindings

### Serialization (`sonic-ux-wasm`)

- [x] JS-friendly `InteractionFrame` with serde
- [x] JS-friendly `InteractionEvent` with tagged enum
- [x] JS-friendly `OutputFrame` conversion
- [x] JS-friendly `MusicParams` (all 8 fields)
- [x] JS-friendly `Diagnostics`
- [x] Note name to number conversion
- [x] Chord degree parsing
- [x] TypeScript type definitions

### API Surface

- [x] `SonicEngine::new(seed, preset)`
- [x] `SonicEngine::update(frame)`
- [x] `SonicEngine::event(event)`
- [x] `SonicEngine::set_section(id)`
- [x] `SonicEngine::set_enabled(bool)`
- [x] `SonicEngine::set_diagnostics(bool)`
- [x] `SonicEngine::set_preset(name)`
- [x] `SonicEngine::set_scale(root, mode)`
- [x] `SonicEngine::set_chord_pool(chords)`
- [x] `SonicEngine::set_modulation_rate(rate)`

---

## Phase 3: Build & Distribution

### Build Pipeline

- [ ] `wasm-pack` build configuration
- [ ] npm package.json
- [ ] CI/CD for automated builds
- [ ] Size optimization (wasm-opt)

### Documentation

- [x] PRD with all specifications
- [x] Architecture diagrams
- [x] API.md with usage examples
- [x] TypeScript type definitions
- [ ] README.md for npm package

### Testing

- [x] Rust unit tests (13 tests)
- [ ] WASM integration tests
- [ ] Browser smoke test
- [ ] Performance benchmarks

---

## Phase 4: Example & Polish

### Example Application

- [x] Basic HTML + Tone.js example
- [x] Interaction sampler (mouse, scroll)
- [x] Audio synthesis mapping
- [x] Visual feedback (params display)
- [x] Events log

### Polish

- [ ] Error handling improvements
- [ ] Console warnings for invalid input
- [ ] Performance profiling
- [ ] Memory leak checks

---

## Deferred (Post-v1)

- [ ] Importance weighting on IDs
- [ ] Arpeggiation from drag
- [ ] Named smoothing profiles
- [ ] Zero-config wrapper package

---

## Summary

| Category | Completed | Total |
|----------|-----------|-------|
| Core Types | 9/9 | 100% |
| Smoothing | 5/6 | 83% |
| Harmony | 7/7 | 100% |
| Events | 10/10 | 100% |
| Engine | 11/11 | 100% |
| WASM Bindings | 17/17 | 100% |
| Build Pipeline | 0/4 | 0% |
| Documentation | 4/5 | 80% |
| Testing | 1/4 | 25% |
| Example | 5/5 | 100% |
| **Overall** | **69/78** | **88%** |

---

## Notes

Last updated: Implementation complete for core functionality

### Current Focus

Core implementation complete. Ready for build pipeline and testing.

### Blockers

None currently.

### Decisions Made

1. Using workspace layout with two crates (core + wasm)
2. Presets: ambient (default), minimal, dramatic, playful
3. Salience field on all events for host-side filtering
4. Sentinel value -1 for missing pointer data
5. MusicParams: 8 fields matching PRD spec
6. DiagnosticOutput optional in OutputFrame
7. ChordDegree enum for chord pool customization
