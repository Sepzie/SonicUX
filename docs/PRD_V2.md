# Product Requirements Document (PRD) v2

## Project: **sonic-ux**

**Tagline:** Turn user interactions into tasteful, real-time ambient music with a one-line setup.

---

## 1. Overview

**sonic-ux** is a Rust + WASM musicalization engine with a **built-in audio layer** so developers can import a single package and get musical output immediately. It still exposes a headless mode for advanced integrations, but the default experience is **plug-and-play**.

The core remains deterministic, portable, and testable, while the package provides a default Web Audio synth graph that can be swapped or extended.

---

## 2. Goals and Non-Goals

### Goals

- Provide a one-step setup that creates audible musical output without external audio wiring.
- Preserve the existing musical intelligence layer (smoothing, harmony, events).
- Offer sensible, expressive defaults that feel musical out of the box.
- Support opt-in synth injection and advanced customization.
- Remain portable across web contexts via WASM.

### Non-Goals

- Build a full audio workstation or DAW.
- Replace all Web Audio tooling or synth frameworks.
- Require users to learn or configure audio libraries to hear results.
- Provide offline rendering or non-real-time batch output.

---

## 3. Target Users

- Creative developers who want musical feedback with minimal setup.
- Portfolio builders who want a striking, musical UX.
- Frontend engineers who want to layer audio without deep DSP knowledge.
- Advanced users who want to inject custom synth graphs.

---

## 4. Product Principles

- **Instant gratification:** One import, one init, sound appears.
- **Musical by default:** High-quality presets and guardrails prevent harshness.
- **Upgradeable:** Advanced users can override the audio layer.
- **Deterministic core:** Musical logic stays stable and testable.

---

## 5. Architecture (v2)

### 5.1 Core Musical Engine (Rust + WASM)

- Receives `InteractionFrame` + discrete events.
- Outputs smoothed parameters, harmony state, discrete events, and optional continuous hold output.
- Deterministic logic and tests remain in Rust.

### 5.2 Built-In Audio Layer (JavaScript)

- Web Audio graph bundled with the package.
- Maps engine output to a default synth (ambient, minimal, etc.).
- Ships with a compressor/limiter chain to prevent clipping.

### 5.3 Integration Modes

**A. Auto Mode (default):**

```ts
const player = await SonicUX.create({ seed: 42n, preset: "ambient" });
player.connect(document); // auto hooks pointer/scroll/visibility
```

**B. Headless Mode (advanced):**

```ts
const engine = await SonicUX.createEngine({ seed: 42n });
const output = engine.update(frame);
customSynth.apply(output);
```

---

## 6. Input Contract (v2)

### 6.1 Continuous Input: `InteractionFrame`

Adds `pointerDown` for click-and-hold behavior.

```ts
type InteractionFrame = {
  tMs: number;
  viewportW: number;
  viewportH: number;
  pointerX: number;
  pointerY: number;
  pointerSpeed: number;
  pointerDown: 0 | 1;
  scrollY: number;
  scrollV: number;
  hoverId: number;
  sectionId: number;
  focus: 0 | 1;
  tabFocused: 0 | 1;
  reducedMotion: 0 | 1;
};
```

### 6.2 Discrete Input: `InteractionEvent`

Unchanged from v1.

---

## 7. Output Contract (v2)

### 7.1 Continuous Output: `MusicParams`

Musical intent parameters remain, but the audio layer can reinterpret them as timbre or modulation, not just volume.

### 7.2 Discrete Output: `MusicEvent`

Same events as v1, with salience.

### 7.3 Hold Output: `HoldState`

New continuous hold output for click-and-hold melodic control.

```ts
type HoldState = {
  note: number;
  vel: number;
};
```

---

## 8. Audio Layer Requirements

- Default synth should sound musical on first interaction.
- Provide a loudness-safe chain (compressor + limiter).
- Support crossfade for navigation chord transitions.
- Allow synth injection at runtime:

```ts
player.setSynth(customSynth);
```

---

## 9. Extensibility

- Expose core output for advanced mapping.
- Allow swapping the default audio layer without touching the Rust core.
- Optional future: generic axes (`signal1..signalN`) for fully neutral mapping.

---

## 10. Success Criteria

- A new user can hear coherent music within 60 seconds of install.
- Defaults feel expressive without manual tuning.
- The engine remains reusable outside the default audio layer.

