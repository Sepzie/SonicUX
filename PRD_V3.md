# Product Requirements Document (PRD) v3

## Project: **sonic-ux**

**Tagline:** A toolkit of musical behaviors that makes any website sing.

---

## 1. Overview

**sonic-ux** is a TypeScript + Tone.js library that provides a collection of **musical behaviors** that developers can wire to specific UI elements. Instead of a monolithic "musification engine," it's a toolkit where you compose musical interactions exactly how you want them.

The library manages:
- Shared harmonic context (key, mode, chord progressions)
- Tone.js voice allocation and synthesis
- Smooth transitions and musical coherence
- Performance and accessibility concerns

Developers get:
- Simple, declarative API (`sonic.pluck('.button')`)
- Instant musical feedback with zero audio knowledge required
- Full control over what sounds where
- Expandable behavior system

---

## 2. Core Philosophy

### 2.1 Toolkit, Not Framework

sonic-ux provides musical building blocks. You decide:
- Which elements make sound
- What kind of sound they make
- When and how they respond

### 2.2 Musical by Default

Zero-config should sound good:
- Harmonically coherent (everything in key)
- Volume-balanced (no jarring loud/quiet jumps)
- Tasteful defaults (ambient, not annoying)

### 2.3 Progressively Complex

```typescript
// Simple - works out of the box
sonic.pluck('.button');

// Advanced - full control
sonic.pluck('.button', {
  voice: 'bell',
  velocity: 0.8,
  scale: [0, 2, 4, 7, 9], // pentatonic
  onNote: (note) => console.log(note)
});
```

---

## 3. Architecture

### 3.1 Core Components

```
sonic-ux/
├── HarmonyManager    // Key, mode, chord progressions, scale math
├── SynthEngine       // Tone.js voice management and synthesis
├── BehaviorSystem    // Musical behavior implementations
└── Tracker           // DOM event listening and normalization
```

### 3.2 Behavior Lifecycle

1. Developer wires behavior to element(s)
2. Tracker listens for relevant DOM events
3. Behavior converts interaction → musical intent
4. HarmonyManager provides harmonic context
5. SynthEngine renders audio via Tone.js

---

## 4. Musical Behaviors (v1)

### 4.1 Global Behaviors

#### `sonic.drone(options)`

Ambient background layer that responds to global interaction state.

```typescript
sonic.drone.start({
  chord: 'I',              // Starting chord (I, IV, V, vi, etc.)
  voices: 3,               // Number of drone voices
  mousePosition: true,     // Shift voice mix based on XY position
  mouseVelocity: 0.2,      // Volume boost from mouse speed (0-1)
  volume: -18,             // Base volume in dB
});

sonic.drone.stop();        // Fade out drone
```

**Behavior:**
- Always playing (sustained)
- Mouse position shifts the relative volume of drone voices
- Mouse velocity adds subtle energy (easter egg)
- Smooth transitions between chords

#### `sonic.drone.sections(zones)`

Change drone chord based on scroll position.

```typescript
sonic.drone.sections([
  { selector: '#hero', chord: 'I' },
  { selector: '#about', chord: 'vi' },
  { selector: '#work', chord: 'IV' },
]);
```

**Behavior:**
- Detects which section is in viewport center
- Crossfades to new chord when section changes
- Smooth harmonic transitions (voice leading)

---

### 4.2 Element Behaviors

#### `sonic.pluck(selector, options)`

Click triggers a short melodic note.

```typescript
sonic.pluck('.button');

sonic.pluck('.cta', {
  voice: 'bell',           // Synth preset: bell, marimba, pluck
  velocity: 0.8,           // Note velocity (0-1)
  noteSelection: 'random', // random | sequential | position
  octave: 4,               // MIDI octave
});
```

**Behavior:**
- Click → trigger note
- Note selected from current scale
- Short attack/release envelope

#### `sonic.continuous(selector, options)`

Click-and-hold plays sustained note with XY control.

```typescript
sonic.continuous(document.body, {
  xAxis: 'pitch',          // left-right controls pitch
  yAxis: 'waveform',       // up-down morphs waveform (sine→saw)
  portamento: 0.05,        // Pitch glide time (seconds)
  voice: 'synth',          // Synth preset
});
```

**Behavior:**
- Pointer down → trigger note sustain
- X position → selects scale degree (quantized to scale)
- Y position → morphs waveform or filter
- Pointer move → glide to new pitch
- Pointer up → release note

#### `sonic.arpeggio(selector, options)`

Click-and-hold plays a note sequence.

```typescript
sonic.arpeggio('.card', {
  pattern: 'up',           // up | down | upDown | random
  speed: 8,                // Note duration (Tone.js time: 8n, 16n)
  notes: [0, 2, 4, 7],     // Scale degrees or custom intervals
  voice: 'pluck',
});
```

**Behavior:**
- Pointer down (or click) → start arpeggio
- Plays note pattern from current chord/scale
- Pointer up → fade out

#### `sonic.hoverSound(selector, options)`

Play sounds on hover enter/exit.

```typescript
sonic.hoverSound('.menu-item', {
  enter: 'chime',          // Sound on mouseenter
  exit: 'click',           // Sound on mouseleave
  voice: 'bell',
});
```

**Behavior:**
- `mouseenter` → play enter sound
- `mouseleave` → play exit sound
- Short, non-overlapping sounds

#### `sonic.chordPad(selector, options)`

Sustain a chord while hovering.

```typescript
sonic.chordPad('.section', {
  chord: 'I',              // Chord degree or custom notes
  voice: 'pad',            // Synth preset
  fadeIn: 0.3,             // Fade in time (seconds)
  fadeOut: 0.5,            // Fade out time (seconds)
});
```

**Behavior:**
- `mouseenter` → fade in chord
- Sustains while hovering
- `mouseleave` → fade out chord

---

## 5. API Design

### 5.1 Initialization

```typescript
import SonicUX from 'sonic-ux';

const sonic = await SonicUX.create({
  key: 'C',                // Root note (C, D, Eb, etc.)
  mode: 'minor',           // Scale mode
  preset: 'ambient',       // Synth preset pack
  masterVolume: -12,       // Master output level (dB)
  polyphony: 16,           // Max simultaneous voices
});
```

### 5.2 Harmonic Control

```typescript
// Change key/mode
sonic.setKey('A', 'major');

// Modulate to relative key
sonic.modulate('relative');   // relative | dominant | subdominant

// Custom scale
sonic.setScale([0, 2, 4, 5, 7, 9, 11]); // Major scale intervals

// Chord pool for progressions
sonic.setChordPool(['I', 'IV', 'V', 'vi']);
```

### 5.3 Global Controls

```typescript
// Master controls
sonic.setVolume(-15);          // Master volume (dB)
sonic.mute();                  // Fade out all voices
sonic.unmute();                // Fade in

// Enable/disable
sonic.enable();
sonic.disable();

// Cleanup
sonic.destroy();               // Stop all sounds, remove listeners
```

### 5.4 Preset System

```typescript
// Apply preset pack (configures all synth voices)
sonic.setPreset('ambient');    // ambient | playful | dramatic | glitchy

// List available presets
SonicUX.presets();             // ['ambient', 'playful', 'dramatic', ...]
```

---

## 6. Harmonic System

### 6.1 Automatic Harmony Management

The library maintains musical coherence:

- All behaviors share the same key/mode/scale
- Notes are quantized to the current scale
- Chord progressions follow basic voice leading
- Smooth transitions between harmonic changes

### 6.2 Supported Modes

- **Major modes**: major, lydian, mixolydian
- **Minor modes**: minor, dorian, phrygian
- **Pentatonic**: pentatonic_major, pentatonic_minor
- **Custom**: Provide interval array

### 6.3 Chord System

Chords are specified by Roman numeral degree:
- `I`, `ii`, `iii`, `IV`, `V`, `vi`, `vii°`
- Automatically voiced from current scale
- Smart voice leading between changes

---

## 7. Synthesis Layer

### 7.1 Voice Presets

Built-in synth presets for different timbres:

| Preset | Character | Use Case |
|--------|-----------|----------|
| `bell` | Bright, clear | Buttons, plucks |
| `pluck` | Short, percussive | Clicks, accents |
| `pad` | Warm, sustained | Drone, chords |
| `synth` | Versatile lead | Continuous control |
| `marimba` | Wooden, mellow | Arpeggio, melody |

### 7.2 Audio Chain

All voices route through:
```
Voice → Reverb → Compressor → Limiter → Destination
```

- **Reverb**: Ambient space (configurable wet/dry)
- **Compressor**: Glue and prevent volume spikes
- **Limiter**: Hard ceiling at -1dB (protect ears)

### 7.3 Performance Management

- **Polyphony limiting**: Max N simultaneous voices
- **Voice stealing**: Oldest/quietest voices released first
- **Efficient updates**: Interaction throttled to 60fps
- **Auto-suspend**: Mute when tab unfocused

---

## 8. Accessibility & Responsiveness

### 8.1 Reduced Motion

When `prefers-reduced-motion: reduce` is detected:
- Disable continuous behaviors
- Reduce arpeggio speed
- Simplify transitions

### 8.2 Auto-muting

Automatically mute when:
- Browser tab loses focus
- User scrolls away from page
- Configurable timeout on idle

### 8.3 Volume Safety

- All volumes pre-balanced
- Hard limiter prevents clipping
- Smooth ramps (no zipper noise)
- Conservative defaults

---

## 9. Developer Experience

### 9.1 TypeScript First

Full type definitions for:
- All API methods
- Configuration options
- Event callbacks
- Return values

### 9.2 Debug Mode

```typescript
sonic.debug(true);
```

Enables:
- Visual overlay showing active behaviors
- Console logging of musical events
- Performance metrics
- Harmonic state display

### 9.3 Event Hooks

```typescript
sonic.on('notePlay', (note, velocity) => {
  console.log(`Note ${note} at velocity ${velocity}`);
});

sonic.on('chordChange', (chord) => {
  console.log(`Chord changed to ${chord}`);
});

sonic.on('sectionChange', (section) => {
  console.log(`Scrolled to section: ${section}`);
});
```

---

## 10. Advanced Features (Future)

### 10.1 Custom Behaviors

```typescript
import { createBehavior } from 'sonic-ux';

const myBehavior = createBehavior({
  name: 'wobble',

  setup(element, options) {
    // Initialization
  },

  onInteraction(event, harmony) {
    // Return notes to play
    return { note: 60, velocity: 0.8 };
  },

  cleanup() {
    // Teardown
  }
});

sonic.register(myBehavior);
sonic.wobble('.special');
```

### 10.2 Custom Synths

```typescript
import * as Tone from 'tone';

sonic.registerVoice('custom', {
  create: () => new Tone.Synth(),
  connect: (synth, destination) => synth.connect(destination),
  play: (synth, note, velocity, duration) => {
    synth.triggerAttackRelease(note, duration, undefined, velocity);
  }
});
```

### 10.3 Interaction Recording

```typescript
// Record user interactions
const recording = sonic.record();

// Playback later
sonic.playback(recording);

// Export for sharing
const json = recording.export();
```

---

## 11. Package Structure

```
sonic-ux/
├── src/
│   ├── index.ts              // Main API
│   ├── core/
│   │   ├── harmony.ts        // Key, mode, scale, chords
│   │   ├── synth-engine.ts   // Tone.js management
│   │   └── tracker.ts        // DOM event handling
│   ├── behaviors/
│   │   ├── drone.ts
│   │   ├── pluck.ts
│   │   ├── continuous.ts
│   │   ├── arpeggio.ts
│   │   ├── hover-sound.ts
│   │   └── chord-pad.ts
│   ├── presets/
│   │   ├── ambient.ts
│   │   ├── playful.ts
│   │   └── dramatic.ts
│   ├── voices/
│   │   └── index.ts          // Synth voice definitions
│   └── types.ts
├── examples/
│   ├── basic/
│   ├── portfolio/
│   └── interactive-demo/
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

---

## 12. Release Strategy

### v0.1 - MVP (Core Behaviors)
- Initialization API
- Basic behaviors: pluck, continuous, drone
- Single preset (ambient)
- Essential harmonic system

### v0.2 - Rich Interactions
- All v1 behaviors
- Multiple presets
- Debug mode
- Full TypeScript types

### v0.3 - Polish
- Performance optimization
- Enhanced presets
- Comprehensive docs
- Interactive demo site

### v1.0 - Production Ready
- Stable API
- Full test coverage
- Accessibility audit
- Published to npm

---

## 13. Success Criteria

1. **Time to First Sound**: Developer can have working musical UX in < 5 minutes
2. **Sounds Good**: Zero-config produces pleasant, non-annoying audio
3. **Feels Intuitive**: API is self-explanatory from autocomplete
4. **Performs Well**: No jank on 60fps scroll/interaction
5. **Real-world Use**: Deployed in at least 3 production websites (starting with your portfolio)

---

## 14. Technical Constraints

- **Browser**: Modern evergreen (ES2020+)
- **Dependencies**: Tone.js (only required dependency)
- **Bundle size**: Target < 50KB gzipped
- **Performance**: < 5ms per interaction frame
- **Memory**: Graceful degradation beyond polyphony limit

---

## 15. Non-Goals (Out of Scope)

- Mobile app support (Web Audio only)
- Server-side rendering
- Audio recording/export
- MIDI controller support
- Complex sequencing/DAW features
- Non-realtime audio processing

---

*Document version: 3.0 — Complete reboot focused on modular behaviors and developer experience*
