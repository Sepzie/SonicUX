# SonicUX API Reference

This document describes the JavaScript/TypeScript API for the SonicUX musicalization engine.

## Installation

```bash
npm install sonic-ux
```

## Quick Start

```typescript
import { SonicEngine } from 'sonic-ux';

// Create engine with seed and optional preset
const engine = new SonicEngine(42n, 'ambient');

// In your animation loop
function tick() {
  const output = engine.update({
    tMs: performance.now(),
    pointerX: mouseX / window.innerWidth,
    pointerY: mouseY / window.innerHeight,
    pointerSpeed: calculateSpeed(),
    scrollY: window.scrollY / maxScroll,
    scrollV: scrollVelocity,
    hoverId: currentHoverId,
    sectionId: currentSection,
    focus: document.hasFocus() ? 1 : 0,
    tabFocused: !document.hidden ? 1 : 0,
    reducedMotion: prefersReducedMotion ? 1 : 0,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
  });

  // Use output.params for continuous audio control
  synth.filter.frequency.value = output.params.brightness * 2000;
  synth.reverb.wet.value = output.params.reverb;

  // Use output.events for discrete sounds
  for (const event of output.events) {
    handleMusicEvent(event);
  }

  requestAnimationFrame(tick);
}
```

---

## SonicEngine

The main engine class.

### Constructor

```typescript
new SonicEngine(seed: bigint, preset?: string)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `seed` | `bigint` | RNG seed for deterministic behavior |
| `preset` | `string?` | Harmony preset: `"ambient"`, `"minimal"`, `"dramatic"`, `"playful"` |

### Methods

#### `update(frame: InteractionFrame): OutputFrame`

Process an interaction frame and return musical output.

```typescript
const output = engine.update({
  tMs: 1000,
  pointerX: 0.5,
  pointerY: 0.5,
  // ... other fields
});
```

#### `event(event: InteractionEvent): MusicEvent[]`

Process a discrete interaction event.

```typescript
const events = engine.event({
  type: 'click',
  x: 0.5,
  y: 0.5,
  targetId: 123,
});
```

#### `set_section(sectionId: number): void`

Notify the engine of a section/route change.

#### `set_enabled(enabled: boolean): void`

Enable or disable the engine. When disabled, `update()` returns empty output.

#### `set_diagnostics(enabled: boolean): void`

Enable diagnostic output in the `OutputFrame`.

#### `set_preset(name: string): void`

Change the harmony preset.

| Preset | Character | Scale/Mode |
|--------|-----------|------------|
| `ambient` | Lush, dreamy | Major/Lydian |
| `minimal` | Sparse, calm | Pentatonic |
| `dramatic` | Tense, cinematic | Minor/Dorian |
| `playful` | Bright, bouncy | Major pentatonic |

#### `set_scale(root: string, mode: string): void`

Set the musical scale directly.

```typescript
engine.set_scale('A', 'minor');
engine.set_scale('C', 'lydian');
engine.set_scale('D', 'pentatonic_major');
```

**Supported modes:**
- `major`, `minor`, `dorian`, `mixolydian`, `lydian`, `phrygian`
- `pentatonic_major`, `pentatonic_minor`

#### `set_chord_pool(chords: string[]): void`

Define the available chord progressions.

```typescript
engine.set_chord_pool(['I', 'IV', 'V', 'vi']);
```

#### `set_modulation_rate(rate: number): void`

Control key change frequency (0–1). Higher = more frequent modulations.

---

## Types

### InteractionFrame

Continuous input sent at a fixed cadence (30–60 Hz recommended).

```typescript
interface InteractionFrame {
  tMs: number;           // Timestamp in milliseconds
  viewportW: number;     // Viewport width in pixels
  viewportH: number;     // Viewport height in pixels
  pointerX: number;      // Pointer X (0..1), or -1 for "no pointer"
  pointerY: number;      // Pointer Y (0..1), or -1 for "no pointer"
  pointerSpeed: number;  // Pointer speed (0..1)
  scrollY: number;       // Scroll Y position (0..1)
  scrollV: number;       // Scroll velocity (-1..1)
  hoverId: number;       // Opaque hover element ID (0 = none)
  sectionId: number;     // Current section/route index
  focus: 0 | 1;          // Window has focus
  tabFocused: 0 | 1;     // Browser tab is visible
  reducedMotion: 0 | 1;  // User prefers reduced motion
}
```

#### Sentinel Values

When data is unavailable:

| Field | Sentinel | Meaning |
|-------|----------|---------|
| `pointerX` | `-1` | No pointer active |
| `pointerY` | `-1` | No pointer active |
| `hoverId` | `0` | No element hovered |

The engine gracefully decays from the last known state rather than zeroing out.

### InteractionEvent

Discrete events sent immediately on occurrence.

```typescript
type InteractionEvent =
  | { type: 'click'; x: number; y: number; targetId: number; weight?: number }
  | { type: 'nav'; sectionId: number; weight?: number }
  | { type: 'hoverStart'; hoverId: number; weight?: number }
  | { type: 'hoverEnd'; hoverId: number; weight?: number };
```

The optional `weight` field (0–1) is reserved for future importance weighting.

### OutputFrame

Output from the engine.

```typescript
interface OutputFrame {
  params: MusicParams;
  harmony: HarmonyState;
  events: MusicEvent[];
  diagnostics?: Diagnostics;  // Only if enabled
}
```

### MusicParams

Continuous musical parameters (all 0–1).

```typescript
interface MusicParams {
  master: number;      // Overall intensity
  warmth: number;      // Harmonic richness
  brightness: number;  // Filter cutoff proxy
  width: number;       // Stereo spread
  motion: number;      // Modulation depth
  reverb: number;      // Spatial depth
  density: number;     // Voice/note activity
  tension: number;     // Harmonic complexity
}
```

### HarmonyState

Current harmonic state.

```typescript
interface HarmonyState {
  root: number;     // Root note (0-11, where 0 = C)
  mode: string;     // Mode name
  tension: number;  // Current tension level (0..1)
}
```

### MusicEvent

Discrete musical events.

```typescript
type MusicEvent =
  | { type: 'pluck'; note: number; vel: number; salience: number }
  | { type: 'padChord'; notes: number[]; vel: number; salience: number }
  | { type: 'cadence'; toKey: number; mode: string; salience: number }
  | { type: 'accent'; strength: number; salience: number }
  | { type: 'mute'; on: boolean; salience: number };
```

All events include a `salience` field (0–1) indicating the engine's assessment of importance. The host decides how to interpret this:

- **Filter:** Only play events with `salience > 0.5`
- **Scale:** Map salience to velocity or volume
- **Ignore:** Play all events

### Diagnostics

Optional diagnostic output for debugging.

```typescript
interface Diagnostics {
  key: number;             // Current key (0-11)
  mode: number;            // Current mode as number
  chord: number;           // Current chord degree (0-6)
  rawActivity: number;     // Unsmoothed activity value
  smoothingAttack: number; // Current attack coefficient
  smoothingRelease: number;// Current release coefficient
  timeSinceEvent: number;  // Ms since last event
}
```

---

## Handling Events

Example event handler for Tone.js:

```typescript
function handleMusicEvent(event: MusicEvent) {
  // Filter by salience if desired
  if (event.salience < 0.3) return;

  switch (event.type) {
    case 'pluck':
      synth.triggerAttackRelease(
        Tone.Frequency(event.note, 'midi').toNote(),
        '8n',
        undefined,
        event.vel
      );
      break;

    case 'padChord':
      const notes = event.notes.map(n =>
        Tone.Frequency(n, 'midi').toNote()
      );
      padSynth.triggerAttackRelease(notes, '2n', undefined, event.vel);
      break;

    case 'cadence':
      // Visual feedback or transition effect
      console.log(`Key change to ${event.toKey} ${event.mode}`);
      break;

    case 'accent':
      // Trigger percussion or rhythmic element
      drums.trigger(event.strength);
      break;

    case 'mute':
      if (event.on) {
        Tone.Transport.stop();
      }
      break;
  }
}
```

---

## Reduced Motion Support

When `reducedMotion: 1` is set, the engine automatically:

- Lowers modulation depth
- Increases smoothing times
- Reduces event frequency

This is equivalent to applying the `minimal` preset overlay. The host doesn't need to adjust their input.

---

## Presets Reference

| Preset | Modulation Rate | Tension Ceiling | Event Density |
|--------|-----------------|-----------------|---------------|
| `ambient` | 0.1 | 0.5 | 0.6 |
| `minimal` | 0.05 | 0.3 | 0.3 |
| `dramatic` | 0.2 | 0.9 | 0.8 |
| `playful` | 0.3 | 0.4 | 1.0 |
