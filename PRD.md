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

  pointerX: number;       // 0..1
  pointerY: number;       // 0..1
  pointerSpeed: number;  // 0..1

  scrollY: number;        // 0..1
  scrollV: number;        // -1..1

  hoverId: number;        // stable id or 0
  sectionId: number;      // route/section index

  focus: 0 | 1;
  reducedMotion: 0 | 1;
};
```

### 5.2 Discrete Input: `InteractionEvent`

Sent immediately on occurrence.

```ts
type InteractionEvent =
  | { type: "click"; x: number; y: number; targetId: number }
  | { type: "nav"; sectionId: number }
  | { type: "hoverStart"; hoverId: number }
  | { type: "hoverEnd"; hoverId: number };
```

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

Musical gestures triggered sparingly.

```ts
type MusicEvent =
  | { type: "pluck"; note: number; vel: number }
  | { type: "padChord"; notes: number[]; vel: number }
  | { type: "cadence"; toKey: number; mode: number }
  | { type: "accent"; strength: number }
  | { type: "mute"; on: 0 | 1 };
```

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
* Reduced-motion mode lowers modulation and disables micro-events.

### FR-2 Harmonic State Management

* Engine maintains a current key and mode.
* Section changes may trigger controlled modulation.
* Harmonic transitions must avoid abrupt dissonance.

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

## 9. API Surface (Minimal v1)

* `engine_new(seed, initialKey, mode)`
* `engine_update(frame) -> OutputFrame`
* `engine_event(event)`
* `engine_set_section(sectionId)`
* `engine_set_enabled(onOff)`

The API is intentionally small to reduce maintenance burden.

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
