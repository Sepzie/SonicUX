/**
 * SonicUX Basic Example
 *
 * This example demonstrates how to integrate SonicUX with Tone.js
 * to create an interactive musical experience.
 */

// NOTE: In production, import from the npm package:
// import { SonicEngine } from 'sonic-ux';

// For this example, we'll create a mock engine that simulates the API
// until the WASM build is available.

class MockSonicEngine {
  constructor(seed, preset = 'ambient') {
    this.seed = seed;
    this.preset = preset;
    this.enabled = true;
    this.lastParams = {
      master: 0.5,
      warmth: 0.5,
      brightness: 0.5,
      width: 0.3,
      motion: 0.3,
      reverb: 0.4,
      density: 0.0,
      tension: 0.3,
    };
    this.harmony = { root: 0, mode: 'lydian', tension: 0.3 };
  }

  update(frame) {
    if (!this.enabled) return { params: this.lastParams, harmony: this.harmony, events: [] };

    // Calculate activity from inputs
    const activity = frame.pointerSpeed * 0.6 + Math.abs(frame.scrollV) * 0.4;

    // Smooth parameter transitions
    const lerp = (a, b, t) => a + (b - a) * t;
    const smoothing = 0.1;

    this.lastParams.master = lerp(this.lastParams.master, 0.4 + activity * 0.4, smoothing);
    this.lastParams.brightness = lerp(this.lastParams.brightness, 0.3 + frame.scrollY * 0.5, smoothing);
    this.lastParams.warmth = lerp(this.lastParams.warmth, 0.4 + activity * 0.4, smoothing);
    this.lastParams.reverb = lerp(this.lastParams.reverb, 0.3 + (1 - activity) * 0.4, smoothing);
    this.lastParams.width = lerp(this.lastParams.width, Math.abs(frame.pointerX - 0.5) * 2, smoothing);
    this.lastParams.density = lerp(this.lastParams.density, activity, smoothing);
    this.lastParams.tension = lerp(this.lastParams.tension, this.harmony.tension, smoothing);
    this.lastParams.motion = lerp(this.lastParams.motion, activity * 0.6, smoothing);

    return {
      params: { ...this.lastParams },
      harmony: { ...this.harmony },
      events: [],
    };
  }

  event(evt) {
    const events = [];

    if (evt.type === 'click') {
      // Generate a pluck based on click position
      const scale = [0, 2, 4, 7, 9]; // Pentatonic
      const degree = Math.floor(evt.x * scale.length);
      const octave = 4 + Math.floor((1 - evt.y) * 2);
      const note = 60 + scale[degree] + (octave - 4) * 12;

      events.push({
        type: 'pluck',
        note,
        vel: 0.5 + (1 - evt.y) * 0.3,
        salience: 0.8,
      });
    }

    if (evt.type === 'nav') {
      // Generate a pad chord for navigation
      const chords = [
        [60, 64, 67], // C major
        [65, 69, 72], // F major
        [67, 71, 74], // G major
        [57, 60, 64], // Am
      ];
      const chord = chords[evt.sectionId % chords.length];

      events.push({
        type: 'padChord',
        notes: chord,
        vel: 0.4,
        salience: 0.9,
      });
    }

    return events;
  }

  set_section(sectionId) {
    return this.event({ type: 'nav', sectionId });
  }

  set_enabled(enabled) {
    this.enabled = enabled;
  }

  set_preset(name) {
    this.preset = name;
  }

  set_scale(root, mode) {
    const noteMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    this.harmony.root = noteMap[root.toUpperCase()] || 0;
    this.harmony.mode = mode;
  }
}

// State
let engine;
let synth;
let padSynth;
let reverb;
let isStarted = false;

// Interaction state
let mouseX = 0.5;
let mouseY = 0.5;
let mouseSpeed = 0;
let lastMouseX = 0.5;
let lastMouseY = 0.5;
let scrollY = 0;
let scrollV = 0;
let lastScrollY = 0;
let currentHoverId = 0;
let currentSection = 0;

// Initialize audio and engine
async function init() {
  // Initialize Tone.js
  await Tone.start();

  // Create synth for plucks
  reverb = new Tone.Reverb({ decay: 2, wet: 0.4 }).toDestination();

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
  }).connect(reverb);

  // Create pad synth for chords
  padSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.5, decay: 1, sustain: 0.5, release: 2 },
  }).connect(reverb);

  padSynth.volume.value = -6;

  // Create the SonicUX engine
  // In production: engine = new SonicEngine(42n, 'ambient');
  engine = new MockSonicEngine(42, 'ambient');

  isStarted = true;
  document.getElementById('startBtn').textContent = 'Audio Started!';
  document.getElementById('startBtn').disabled = true;

  // Start the update loop
  requestAnimationFrame(tick);
}

// Main update loop
function tick() {
  if (!isStarted) {
    requestAnimationFrame(tick);
    return;
  }

  // Calculate velocities
  mouseSpeed = Math.sqrt(
    Math.pow(mouseX - lastMouseX, 2) + Math.pow(mouseY - lastMouseY, 2)
  ) * 10;
  mouseSpeed = Math.min(1, mouseSpeed);

  scrollV = (scrollY - lastScrollY) / 100;
  scrollV = Math.max(-1, Math.min(1, scrollV));

  lastMouseX = mouseX;
  lastMouseY = mouseY;
  lastScrollY = scrollY;

  // Create interaction frame
  const frame = {
    tMs: performance.now(),
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    pointerX: mouseX,
    pointerY: mouseY,
    pointerSpeed: mouseSpeed,
    scrollY: scrollY / (document.body.scrollHeight - window.innerHeight),
    scrollV: scrollV,
    hoverId: currentHoverId,
    sectionId: currentSection,
    focus: document.hasFocus() ? 1 : 0,
    tabFocused: !document.hidden ? 1 : 0,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0,
  };

  // Update engine
  const output = engine.update(frame);

  // Apply params to audio
  applyParams(output.params);

  // Handle events
  for (const event of output.events) {
    handleEvent(event);
  }

  // Update UI
  updateParamsDisplay(output.params);

  requestAnimationFrame(tick);
}

// Apply continuous params to audio
function applyParams(params) {
  // Map brightness to filter (would use a filter in production)
  synth.volume.value = -20 + params.master * 20;

  // Map reverb
  reverb.wet.value = params.reverb;
}

// Handle discrete music events
function handleEvent(event) {
  // Filter by salience
  if (event.salience < 0.3) return;

  logEvent(event);

  switch (event.type) {
    case 'pluck':
      const freq = Tone.Frequency(event.note, 'midi').toNote();
      synth.triggerAttackRelease(freq, '8n', undefined, event.vel);
      break;

    case 'padChord':
      const notes = event.notes.map(n => Tone.Frequency(n, 'midi').toNote());
      padSynth.triggerAttackRelease(notes, '2n', undefined, event.vel);
      break;

    case 'accent':
      // Could trigger percussion here
      break;

    case 'mute':
      if (event.on) {
        synth.releaseAll();
        padSynth.releaseAll();
      }
      break;
  }
}

// Update the params display
function updateParamsDisplay(params) {
  const update = (id, value) => {
    document.getElementById(`param${id}`).textContent = value.toFixed(2);
    document.getElementById(`bar${id}`).style.width = `${value * 100}%`;
  };

  update('Master', params.master);
  update('Brightness', params.brightness);
  update('Warmth', params.warmth);
  update('Reverb', params.reverb);
  update('Tension', params.tension);
}

// Log events to the UI
function logEvent(event) {
  const log = document.getElementById('eventsLog');
  const item = document.createElement('div');
  item.className = 'event-item';

  let text = `${event.type}`;
  if (event.type === 'pluck') {
    text += ` note:${event.note} vel:${event.vel.toFixed(2)}`;
  } else if (event.type === 'padChord') {
    text += ` notes:[${event.notes.join(',')}]`;
  }

  item.textContent = text;
  log.appendChild(item);

  // Fade out old events
  setTimeout(() => item.classList.add('fading'), 2000);
  setTimeout(() => item.remove(), 3000);

  // Keep log from getting too long
  while (log.children.length > 10) {
    log.removeChild(log.children[1]);
  }
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', init);

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
});

document.addEventListener('scroll', () => {
  scrollY = window.scrollY;

  // Detect current section
  const sections = document.querySelectorAll('section');
  sections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
      if (currentSection !== index && isStarted) {
        currentSection = index;
        const events = engine.set_section(index);
        events.forEach(handleEvent);
      }
    }
  });
});

document.addEventListener('click', (e) => {
  if (!isStarted) return;

  const x = e.clientX / window.innerWidth;
  const y = e.clientY / window.innerHeight;

  const events = engine.event({
    type: 'click',
    x,
    y,
    targetId: 0,
  });

  events.forEach(handleEvent);
});

// Hover tracking
document.querySelectorAll('[data-hover-id]').forEach((el) => {
  el.addEventListener('mouseenter', () => {
    currentHoverId = parseInt(el.dataset.hoverId);
  });
  el.addEventListener('mouseleave', () => {
    currentHoverId = 0;
  });
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isStarted) {
    synth.releaseAll();
    padSynth.releaseAll();
  }
});
