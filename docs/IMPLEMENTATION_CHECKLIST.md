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
- [x] `OutputFrame` struct
- [x] `MusicParams` struct
- [x] `MusicEvent` enum with salience field
- [x] `HarmonyState` struct
- [x] `Mode` enum with intervals
- [ ] Unit tests for type conversions

### Smoothing (`smoothing.rs`)

- [x] `SmoothedParam` with attack/release
- [x] `ParamSmoother` for all params
- [x] `DecayingValue` for sentinel handling
- [x] Reduced motion profile application
- [ ] Configurable smoothing profiles (deferred)
- [ ] Unit tests for convergence behavior

### Harmony (`harmony.rs`)

- [x] `Preset` enum (Ambient, Minimal, Dramatic, Playful)
- [x] `HarmonyManager` basic structure
- [x] Scale/mode support
- [x] Chord generation from degrees
- [x] Modulation logic
- [ ] Chord pool customization
- [ ] Unit tests for scale generation

### Events (`events.rs`)

- [x] `EventGenerator` basic structure
- [x] Click → Pluck mapping
- [x] Nav → PadChord mapping
- [x] HoverStart → subtle pluck
- [x] Activity-based accents
- [x] Density control
- [ ] Salience calculation refinement
- [ ] Mute event on tab unfocus
- [ ] Unit tests for event generation

### Engine (`engine.rs`)

- [x] `Engine` struct with all components
- [x] `update()` method
- [x] `event()` method
- [x] `set_preset()`, `set_scale()`, `set_modulation_rate()`
- [x] Reduced motion handling
- [x] Tab focus handling
- [ ] Diagnostic output
- [ ] Unit tests for engine behavior

---

## Phase 2: WASM Bindings

### Serialization (`sonic-ux-wasm`)

- [x] JS-friendly `InteractionFrame` with serde
- [x] JS-friendly `InteractionEvent` with tagged enum
- [x] JS-friendly `OutputFrame` conversion
- [x] Note name to number conversion
- [ ] TypeScript type definitions generation

### API Surface

- [x] `SonicEngine::new(seed, preset)`
- [x] `SonicEngine::update(frame)`
- [x] `SonicEngine::event(event)`
- [x] `SonicEngine::set_section(id)`
- [x] `SonicEngine::set_enabled(bool)`
- [x] `SonicEngine::set_preset(name)`
- [x] `SonicEngine::set_scale(root, mode)`
- [x] `SonicEngine::set_modulation_rate(rate)`
- [ ] `SonicEngine::set_chord_pool(chords)` (deferred)

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
- [ ] API.md with usage examples
- [ ] README.md for npm package
- [ ] TypeScript examples

### Testing

- [ ] Rust unit tests passing
- [ ] WASM integration tests
- [ ] Browser smoke test
- [ ] Performance benchmarks

---

## Phase 4: Example & Polish

### Example Application

- [ ] Basic HTML + Tone.js example
- [ ] Interaction sampler (mouse, scroll)
- [ ] Audio synthesis mapping
- [ ] Visual feedback overlay

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

## Notes

Last updated: Project initialization

### Current Focus

Setting up project foundation and core module structure.

### Blockers

None currently.

### Decisions Made

1. Using workspace layout with two crates (core + wasm)
2. Presets: ambient (default), minimal, dramatic, playful
3. Salience field on all events for host-side filtering
4. Sentinel value -1 for missing pointer data
