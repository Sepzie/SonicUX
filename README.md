# 🎵 sonic-ux

> A toolkit of musical behaviors that makes any website sing.

**sonic-ux** is a TypeScript + Tone.js library that provides a collection of **musical behaviors** you can wire to specific UI elements. Instead of a monolithic "musification engine," it's a toolkit where you compose musical interactions exactly how you want them.

## Features

- 🎹 **6 Musical Behaviors** - pluck, continuous, arpeggio, hoverSound, chordPad, drone
- 🎼 **Harmonic System** - Automatic key/mode/scale management with chord progressions
- 🎨 **4 Built-in Presets** - ambient, playful, dramatic, glitchy
- 🔧 **TypeScript First** - Full type definitions
- 📱 **Mobile Friendly** - Touch support, auto-mute, reduced motion
- 🎚️ **Audio Safety** - Pre-balanced volumes, hard limiter, smooth ramps
- 🐛 **Debug Mode** - Visual overlay showing musical state
- ⚡ **Performance** - Voice stealing, polyphony limiting, 60fps throttling

## Installation

```bash
npm install sonic-ux tone
```

## Quick Start

```typescript
import SonicUX from 'sonic-ux';

// Initialize
const sonic = await SonicUX.create({
  key: 'C',
  mode: 'minor',
  preset: 'ambient',
  masterVolume: -12
});

// Unlock audio (required on mobile)
document.addEventListener('click', () => sonic.unlock(), { once: true });

// Wire behaviors to elements
sonic.pluck('.button');
sonic.hoverSound('.menu-item');
sonic.chordPad('.card');

// Start ambient drone
sonic.drone.start();
```

## Musical Behaviors

### Pluck

Click triggers a short melodic note.

```typescript
sonic.pluck('.button', {
  voice: 'bell',           // Synth preset
  velocity: 0.8,           // Note velocity (0-1)
  noteSelection: 'random', // random | sequential | position
  octave: 4                // MIDI octave
});
```

### Continuous

Click-and-hold plays sustained note with XY control.

```typescript
sonic.continuous('.interactive-area', {
  xAxis: 'pitch',      // left-right controls pitch
  yAxis: 'filter',     // up-down morphs filter
  portamento: 0.05,    // Pitch glide time (seconds)
  voice: 'synth'
});
```

### Arpeggio

Click-and-hold plays a note sequence.

```typescript
sonic.arpeggio('.card', {
  pattern: 'upDown',       // up | down | upDown | random
  speed: '8n',             // Note duration (Tone.js time)
  notes: [0, 2, 4, 7],     // Scale degrees
  voice: 'bell'
});
```

### HoverSound

Play sounds on hover enter/exit.

```typescript
sonic.hoverSound('.menu-item', {
  enter: 0,    // Scale degree or MIDI note
  exit: 2,     // Scale degree or MIDI note
  voice: 'bell'
});
```

### ChordPad

Sustain a chord while hovering.

```typescript
sonic.chordPad('.section', {
  chord: 'i',      // Roman numeral or note array
  voice: 'pad',
  fadeIn: 0.3,     // Fade in time (seconds)
  fadeOut: 0.5     // Fade out time (seconds)
});
```

### Drone

Ambient background layer with global state.

```typescript
sonic.drone.start({
  chord: 'i',              // Starting chord
  voices: 3,               // Number of drone voices
  mousePosition: true,     // Shift voice mix based on XY
  mouseVelocity: 0.2,      // Volume boost from mouse speed
  volume: -18              // Base volume (dB)
});

// Change chord based on scroll position
sonic.drone.sections([
  { selector: '#hero', chord: 'i' },
  { selector: '#about', chord: 'iv' },
  { selector: '#work', chord: 'v' }
]);

sonic.drone.stop(); // Fade out
```

## Harmony Control

```typescript
// Change key/mode
sonic.setKey('A', 'major');

// Modulate to related key
sonic.modulate('relative');   // relative | dominant | subdominant

// Custom scale
sonic.setScale([0, 2, 4, 5, 7, 9, 11]); // Major scale intervals

// Manual chord (advanced)
sonic.lockHarmony();
sonic.setChord([60, 64, 67]); // C major chord
sonic.unlockHarmony();
```

## Global Controls

```typescript
// Master volume
sonic.setVolume(-15);    // dB

// Mute/unmute
sonic.mute();
sonic.unmute();

// Enable/disable
sonic.enable();
sonic.disable();

// Cleanup
sonic.destroy();
```

## Presets

```typescript
// Apply preset pack
sonic.setPreset('ambient');    // ambient | playful | dramatic | glitchy

// List available presets
SonicUX.presets();             // ['ambient', 'playful', 'dramatic', 'glitchy']
```

## Accessibility

```typescript
sonic.setAccessibility({
  reducedMotion: 'auto', // auto | force | off
  allowSound: true       // explicit user toggle
});
```

## Event Hooks

```typescript
sonic.on('notePlay', (note) => {
  console.log(`Note ${note.note} at velocity ${note.velocity}`);
});

sonic.on('chordChange', (chord) => {
  console.log(`Chord changed to ${chord}`);
});

sonic.on('keyChange', ({ key, mode }) => {
  console.log(`Key changed to ${key} ${mode}`);
});
```

## Debug Mode

```typescript
sonic.debug(true);  // Show visual overlay with musical state
```

## Voice Presets

| Voice | Character | Use Case |
|-------|-----------|----------|
| `bell` | Bright, clear | Buttons, plucks |
| `pluck` | Short, percussive | Clicks, accents |
| `pad` | Warm, sustained | Drone, chords |
| `synth` | Versatile lead | Continuous control |
| `marimba` | Wooden, mellow | Arpeggio, melody |

## Supported Modes

- **Major modes**: major, lydian, mixolydian
- **Minor modes**: minor, dorian, phrygian
- **Pentatonic**: pentatonic_major, pentatonic_minor
- **Custom**: Provide interval array

## Browser Support

Modern evergreen browsers (ES2020+):
- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+

## Examples

See `examples/basic/` for a working demo of all behaviors.

Run the example:
```bash
npm run dev
```

Navigate to `http://localhost:5173/examples/basic/`

## API Reference

### Configuration

```typescript
interface SonicConfig {
  key?: string;           // Default: 'C'
  mode?: string;          // Default: 'major'
  preset?: string;        // Default: 'ambient'
  masterVolume?: number;  // Default: -12 (dB)
  polyphony?: number;     // Default: 16
}
```

### Behavior Options

See type definitions in `src/types.ts` for complete option interfaces.

## Performance

- **Polyphony limiting**: Max N simultaneous voices (default 16)
- **Voice stealing**: Oldest voices released first
- **60fps throttling**: Mouse/pointer updates capped
- **Auto-suspend**: Mute when tab loses focus

## Mobile Considerations

- Audio must be user-initiated (call `sonic.unlock()` on first interaction)
- Hover behaviors automatically disabled on touch-only devices
- Lower polyphony recommended for battery life

## License

MIT - see [LICENSE](LICENSE) file for details

## Contributing

Issues and pull requests welcome! This is a v1.0 release and there's room for:
- Additional voice presets
- More behaviors
- Custom behavior API
- Enhanced debug mode
- Test coverage

---

Made with ❤️ and 🎵
