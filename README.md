# SonicUX

A Rust + WASM library that transforms UI interactions into musical parameters and events.

## Overview

SonicUX provides the "musical intelligence" layer for sonified user interfaces. It receives interaction data (mouse position, scroll, clicks) and outputs:

- **Continuous parameters** (cutoff, warmth, stereo width, reverb)
- **Discrete musical events** (pluck, padChord, cadence, accent, mute)

The engine is intentionally decoupled from audio synthesis—you bring your own synth (Tone.js, Web Audio API, etc.).

## Project Structure

```
sonic-ux/
├── crates/
│   ├── sonic-ux-core/     # Core Rust library
│   └── sonic-ux-wasm/     # WASM bindings
├── docs/
│   ├── PRD.md             # Product requirements
│   ├── architecture_diagrams.md
│   └── IMPLEMENTATION_CHECKLIST.md
└── Cargo.toml             # Workspace root
```

## Quick Start

```typescript
import { SonicEngine } from 'sonic-ux';

const engine = new SonicEngine(42, 'ambient');

// In your animation loop
const output = engine.update({
  tMs: performance.now(),
  pointerX: mouseX / window.innerWidth,
  pointerY: mouseY / window.innerHeight,
  pointerSpeed: speed,
  scrollY: scrollY / maxScroll,
  scrollV: scrollVelocity,
  hoverId: 0,
  sectionId: 0,
  focus: 1,
  tabFocused: 1,
  reducedMotion: 0,
  viewportW: window.innerWidth,
  viewportH: window.innerHeight,
});

// Use output.params to control your synth
synth.filter.frequency.value = output.params.cutoff * 2000;

// Use output.events for discrete sounds
for (const event of output.events) {
  if (event.type === 'pluck') {
    synth.triggerAttackRelease(midiToFreq(event.note), '8n', undefined, event.vel);
  }
}
```

## Presets

- **ambient** (default): Lush, dreamy - Major/Lydian, slow modulation
- **minimal**: Sparse, calm - Pentatonic, reduced motion friendly
- **dramatic**: Tense, cinematic - Minor/Dorian, higher tension
- **playful**: Bright, bouncy - Major pentatonic, quicker changes

## Development

```bash
# Build core library
cargo build -p sonic-ux-core

# Build WASM
wasm-pack build crates/sonic-ux-wasm --target web

# Run tests
cargo test
```

## License

MIT
