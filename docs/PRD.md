# Product Requirements Document (PRD)

## Project: **sonic-ux**

**Tagline:** Turn user interactions into tasteful, real-time ambient music.

---

## 1. Overview

**sonic-ux** is a Rust + WASM library that transforms normalized user interaction data from web applications into high-level musical intent. It does not generate audio directly. Instead, it produces musically informed parameters and events that can be mapped to any Web Audio or synthesis layer.

The project is designed to be:

* real-time safe,
* small in scope,
* aesthetically opinionated,
* and reusable across websites, apps, and experiments.

A primary design goal is to **musify interaction without becoming distracting**, providing guardrails that preserve musicality even when driven by noisy input such as scrolling or mouse movement.

---

## 2. Goals and Non-Goals

### Goals

* Convert raw interaction data into musically meaningful outputs.
* Provide built-in smoothing, inertia, and decay to prevent harsh transitions.
* Maintain harmonic coherence through simple musical rules.
* Be portable, lightweight, and easy to embed via WASM.
* Ship as a clean open-source package with documentation and examples.

### Non-Goals

* Implement audio synthesis or DSP primitives.
* Compete with full audio engines or DAWs.
* Support non-real-time batch audio processing.
* Replace existing Web Audio libraries.

---

## 3. Target Users

* Frontend engineers who want expressive audio feedback without deep audio knowledge.
* Creative developers building interactive, ambient, or experimental websites.
* Designers and technologists exploring sound as part of UX.
* Portfolio and demo builders who want musical polish rather than gimmicks.

---

## 4. System Architecture

sonic-ux is composed of three conceptual layers, with only the **Musical Intelligence Layer** implemented in Rust/WASM.

### 4.1 Interaction Layer (JavaScript, host application)

* Captures raw browser events.
* Normalizes values into a consistent, device-agnostic format.
* Emits a continuous `InteractionFrame` at a controlled rate (30–60 Hz).
* Emits discrete interaction events (clicks, navigation, hover).

### 4.2 Musical Intelligence Layer (Rust + WASM, sonic-ux)

* Maintains harmonic state and musical context.
* Smooths all continuous parameters to avoid zipper noise.
* Converts interaction energy into musical tension and density.
* Emits high-level musical intent, not raw audio instructions.

### 4.3 Audio Synthesis Layer (JavaScript, host application)

* Maps musical intent to actual synth parameters.
* Owns all Web Audio nodes and scheduling.
* Can be swapped freely (Tone.js, raw Web Audio, custom engines).

This separation ensures sonic-ux remains backend-agnostic and future-proof.

---

## 5. Input Contract

### 5.1 Continuous Input: `InteractionFrame`

Sent at a fixed cadence from JS to WASM.

```ts
type InteractionFrame = {
  tMs: number;

  viewportW: number;
  viewportH: number;

  pointerX: number;       // 0..1, or -1 for "no pointer active"
  pointerY: number;       // 0..1, or -1 for "no pointer active"
  pointerSpeed: number;   // 0..1

  scrollY: number;        // 0..1
  scrollV: number;        // -1..1

  hoverId: number;        // opaque stable id or 0
  sectionId: number;      // route/section index

  focus: 0 | 1;
  tabFocused: 0 | 1;      // browser tab visibility for auto-mute suggestions
  reducedMotion: 0 | 1;
};
```

#### 5.1.1 Missing Data Handling

When data is unavailable (e.g., pointer leaves viewport, touch ends), the host should send sentinel values:

| Field | Sentinel | Meaning |
|-------|----------|---------|
| `pointerX` | `-1` | No pointer active |
| `pointerY` | `-1` | No pointer active |
| `hoverId` | `0` | No element hovered |

**Engine behavior:** When sentinel values are received, the engine gracefully maintains the last known state with natural decay rather than zeroing out. This prevents jarring transitions when the pointer briefly leaves the window or touch ends.

The host may override this behavior by providing synthetic values if desired (e.g., smoothly animating pointer position off-screen).

### 5.2 Discrete Input: `InteractionEvent`

Sent immediately on occurrence.

```ts
type InteractionEvent =
  | { type: "click"; x: number; y: number; targetId: number; weight?: number }
  | { type: "nav"; sectionId: number; weight?: number }
  | { type: "hoverStart"; hoverId: number; weight?: number }
  | { type: "hoverEnd"; hoverId: number; weight?: number };
```

#### 5.2.1 ID Semantics

All ID fields (`hoverId`, `targetId`, `sectionId`) are **fully opaque** to the engine. The engine uses them only for change detection (e.g., "did the hovered element change?") and never interprets their meaning. The host application owns all semantic meaning.

#### 5.2.2 Importance Weighting (Future)

The optional `weight` field (0–1) provides a hint for future importance weighting. For example, a "primary action" button click might have `weight: 1.0` while a minor UI toggle might have `weight: 0.3`.

**v1 behavior:** The engine ignores this field. Document in API.md, defer implementation until needed.

---

## 6. Output Contract

### 6.1 Continuous Output: `MusicParams`

Smoothed, bounded values suitable for direct mapping to audio parameters.

```ts
type MusicParams = {
  master: number;      // overall intensity
  warmth: number;      // harmonic richness
  brightness: number;  // filter cutoff proxy
  width: number;       // stereo spread
  motion: number;      // modulation depth
  reverb: number;      // spatial depth
  density: number;     // voice or note activity
  tension: number;     // harmonic complexity
};
```

### 6.2 Discrete Output: `MusicEvent`

Musical gestures triggered sparingly. All events include a `salience` field.

```ts
type MusicEvent =
  | { type: "pluck"; note: number; vel: number; salience: number }
  | { type: "padChord"; notes: number[]; vel: number; salience: number }
  | { type: "cadence"; toKey: number; mode: number; salience: number }
  | { type: "accent"; strength: number; salience: number }
  | { type: "mute"; on: 0 | 1; salience: number };
```

#### 6.2.1 Salience-Based Output

The engine always emits events with a `salience: number` field (0–1) indicating how "important" the engine considers the event. The host decides how to interpret salience:

* **Filter:** Only play events with `salience > 0.5`
* **Scale:** Map salience to velocity or volume
* **Ignore:** Play all events regardless of salience

**Design rationale:** The engine has no zone awareness—the host owns all hierarchy logic (what's a "primary" area vs. background). Salience represents the engine's internal assessment of musical importance, not UI importance.

#### 6.2.2 Event Types (v1)

Keep event types minimal for v1. Only add new types if distinct synthesis behavior is needed:

| Type | Purpose |
|------|---------|
| `pluck` | Short melodic gesture (click, tap) |
| `padChord` | Sustained harmonic bed (section change, idle) |
| `cadence` | Key/mode transition marker |
| `accent` | Rhythmic emphasis without pitch |
| `mute` | Fade out / silence trigger |

### 6.3 Optional Diagnostic Output

```ts
harmony: {
  key: number;
  mode: number;
  chord: number;
};
```

Intended for debugging, visualization, or educational overlays.

---

## 7. Core Functional Requirements

### FR-1 Interaction Conditioning

* All continuous inputs must be smoothed using configurable attack/release curves.
* Sudden spikes decay naturally over time.
* Ship with sensible defaults biased toward slow attack/release for a non-annoying feel.
* Expose later via `engine_set_smoothing_profile(params)` or per-parameter hooks.
* Defer detailed tuning to implementation phase.

#### FR-1.1 Reduced Motion Support

When `reducedMotion: 1` is set in the `InteractionFrame`, the engine internally:

* Lowers modulation depth
* Increases smoothing times
* Reduces event frequency

This is equivalent to applying a "minimal" profile overlay automatically. The host does not need to adjust their input—the engine handles the adaptation.

### FR-2 Harmonic State Management

* Engine maintains a current key and mode.
* Section changes may trigger controlled modulation.
* Harmonic transitions must avoid abrupt dissonance.

#### FR-2.1 Harmony Presets

Ship with named presets that configure scale, chord pool, and modulation behavior:

| Preset | Character | Scale/Mode | Behavior |
|--------|-----------|------------|----------|
| `ambient` | Lush, dreamy (default) | Major/Lydian | Slow modulation, rich chords |
| `minimal` | Sparse, calm | Pentatonic | Reduced motion friendly, fewer notes |
| `dramatic` | Tense, cinematic | Minor/Dorian | Higher tension ceiling, darker |
| `playful` | Bright, bouncy | Major pentatonic | Quicker changes, lighter feel |

#### FR-2.2 Harmony Hooks

Expose hooks for granular control beyond presets:

```ts
engine_set_preset(name: string)
engine_set_scale(root: string, mode: string)  // e.g., "A", "minor"
engine_set_chord_pool(chords: string[])       // e.g., ["I", "IV", "vi", "V"]
engine_set_modulation_rate(rate: number)      // 0..1, how often key changes occur
```

**Scale names:** Support common modes via string matching:
* Major modes: `major`, `lydian`, `mixolydian`
* Minor modes: `minor`, `dorian`, `phrygian`
* Pentatonic: `pentatonic_major`, `pentatonic_minor`

Alternative: accept root + interval array for custom scales (e.g., `[0, 2, 4, 5, 7, 9, 11]` for major).

### FR-3 Event Generation

* Clicks generate short, velocity-scaled gestures.
* Navigation triggers cadences or harmonic shifts.
* Idle periods gradually reduce density and motion.

### FR-4 Determinism and Stability

* No heap allocations during `update`.
* Bounded outputs at all times.
* Predictable CPU usage per frame.

---

## 8. Repository Structure

```text
sonic-ux/
├── crates/
│   └── musicalization-core/
│       ├── src/
│       │   ├── lib.rs
│       │   ├── interaction.rs
│       │   ├── harmony.rs
│       │   ├── smoothing.rs
│       │   └── events.rs
│       ├── Cargo.toml
│       └── tests/
├── pkg/                         # WASM build output
├── js/
│   ├── src/
│   │   └── bindings.ts
│   ├── package.json
│   └── tsconfig.json
├── examples/
│   └── basic-usage/
│       ├── index.html
│       └── main.js
├── docs/
│   ├── API.md
│   └── DESIGN.md
├── .github/
│   └── workflows/
│       └── publish.yml
├── README.md
└── LICENSE
```

This layout explicitly supports future bindings (e.g., native, desktop, other runtimes) without restructuring the core.

---

## 9. API Surface (v1)

### 9.1 Core Functions

* `engine_new(seed, initialKey, mode)` — Initialize engine with RNG seed and starting harmony
* `engine_update(frame) -> OutputFrame` — Process interaction frame, return musical output
* `engine_event(event)` — Handle discrete interaction events
* `engine_set_section(sectionId)` — Notify engine of navigation/section change
* `engine_set_enabled(onOff)` — Enable/disable engine output

### 9.2 Harmony Control

* `engine_set_preset(name)` — Apply a named preset (`ambient`, `minimal`, `dramatic`, `playful`)
* `engine_set_scale(root, mode)` — Set scale (e.g., `"C", "major"` or `"A", "minor"`)
* `engine_set_chord_pool(chords[])` — Define available chords
* `engine_set_modulation_rate(rate)` — Control key change frequency (0–1)

### 9.3 Future Hooks (Deferred)

* `engine_set_smoothing_profile(params)` — Fine-tune attack/release curves

The API is intentionally small to reduce maintenance burden. New functions should only be added when there's a clear use case.

---

## 10. Release Strategy

### v0.1

* Core interaction → music mapping
* Single harmony model
* Basic example with Tone.js

### v0.2

* Configurable smoothing profiles
* Multiple harmonic modes
* Debug/diagnostic outputs

### v1.0

* Stable API
* Documented musical design principles
* Published to npm and crates.io

---

## 11. Success Criteria

* Can be integrated into a web app in under 30 minutes.
* Produces pleasant sound with zero configuration.
* Never generates harsh or startling audio by default.
* Clear separation between musical logic and synthesis.
* Used as a demo backend in at least one real project (your portfolio).

---

## 12. Deferred Ideas (Post-v1)

The following features are explicitly out of scope for v1 but may be valuable later:

### 12.1 Advanced Weighting

* **Importance weighting on hover/target IDs** — Let the host hint that certain elements are more "important" musically. Currently deferred because the engine doesn't interpret IDs semantically.

### 12.2 Instrument Zone Features

* **Arpeggiation from drag** — Continuous note streams when dragging across an instrument zone. Requires more complex state management and synthesis coordination.

### 12.3 Named Smoothing Profiles

* **Profile presets:** `"responsive"`, `"ambient"`, `"cinematic"` — Pre-tuned smoothing curves for different feels. Defer until we understand real-world tuning needs.

### 12.4 Developer Experience

* **Wrapper package for zero-config frontend devs** — A higher-level package that bundles sonic-ux with a default synth (e.g., Tone.js) for instant gratification. Adds maintenance burden and opinionation.

---

*Document version: 2.0 — Updated with interaction frame handling, salience-based events, harmony presets, and deferred roadmap.*
