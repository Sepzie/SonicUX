/**
 * SonicUX Basic Example
 *
 * This example demonstrates how to integrate SonicUX with Tone.js
 * to create an interactive musical experience.
 */

import initWasm, { SonicEngine } from '../../crates/sonic-ux-wasm/pkg/sonic_ux_wasm.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// State
let engine;
let synth;
let navSynthA;
let navSynthB;
let hoverSynth;
let holdSynth;
let reverb;
let compressor;
let limiter;
let isStarted = false;
let navGainA;
let navGainB;
let hoverGain;
let activeNavIndex = 0;
let navNotes = [null, null];
let hoverNotes = null;
let navTargetDb = -18;
let hoverTargetDb = -22;
let navReleaseTimeouts = [null, null];
let navHoldTimeouts = [null, null];
let holdActive = false;
let holdNote = null;

const NAV_FADE_SEC = 0.15;
const NAV_HOLD_SEC = 1.2;

const ui = {
  startBtn: document.getElementById('startBtn'),
  engineEnabled: document.getElementById('engineEnabled'),
  diagnosticsEnabled: document.getElementById('diagnosticsEnabled'),
  presetSelect: document.getElementById('presetSelect'),
  scaleRoot: document.getElementById('scaleRoot'),
  scaleMode: document.getElementById('scaleMode'),
  applyScale: document.getElementById('applyScale'),
  chordPool: document.getElementById('chordPool'),
  applyChords: document.getElementById('applyChords'),
  modulationRate: document.getElementById('modulationRate'),
  modRateValue: document.getElementById('modRateValue'),
  clickX: document.getElementById('clickX'),
  clickXValue: document.getElementById('clickXValue'),
  clickY: document.getElementById('clickY'),
  clickYValue: document.getElementById('clickYValue'),
  triggerClick: document.getElementById('triggerClick'),
  sectionIdInput: document.getElementById('sectionIdInput'),
  triggerNav: document.getElementById('triggerNav'),
  hoverIdInput: document.getElementById('hoverIdInput'),
  hoverStartBtn: document.getElementById('hoverStartBtn'),
  hoverEndBtn: document.getElementById('hoverEndBtn'),
  harmonyRoot: document.getElementById('harmonyRoot'),
  harmonyMode: document.getElementById('harmonyMode'),
  harmonyTension: document.getElementById('harmonyTension'),
  diagnosticsStatus: document.getElementById('diagnosticsStatus'),
  diagKey: document.getElementById('diagKey'),
  diagMode: document.getElementById('diagMode'),
  diagChord: document.getElementById('diagChord'),
  diagActivity: document.getElementById('diagActivity'),
  diagSmoothing: document.getElementById('diagSmoothing'),
  diagSinceEvent: document.getElementById('diagSinceEvent'),
};

// Interaction state
let mouseX = 0.5;
let mouseY = 0.5;
let mouseSpeed = 0;
let lastMouseX = 0.5;
let lastMouseY = 0.5;
let pointerDown = false;
let scrollY = 0;
let scrollV = 0;
let lastScrollY = 0;
let currentHoverId = 0;
let currentSection = 0;

function safeEngineCall(action, label) {
  if (!engine) return;
  try {
    action();
  } catch (error) {
    console.error(`Engine call failed (${label})`, error);
  }
}

function safeEngineEvent(payload, label) {
  if (!engine) return [];
  try {
    return engine.event(payload) || [];
  } catch (error) {
    console.error(`Engine event failed (${label})`, error);
    return [];
  }
}

function parseChordPool(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateDiagnosticsStatus(enabled) {
  ui.diagnosticsStatus.textContent = enabled ? 'on' : 'off';
  if (!enabled) {
    ui.diagKey.textContent = '-';
    ui.diagMode.textContent = '-';
    ui.diagChord.textContent = '-';
    ui.diagActivity.textContent = '-';
    ui.diagSmoothing.textContent = '-';
    ui.diagSinceEvent.textContent = '-';
  }
}

function updateDiagnosticsDisplay(diagnostics) {
  if (!diagnostics) {
    updateDiagnosticsStatus(false);
    return;
  }

  ui.diagnosticsStatus.textContent = 'on';
  ui.diagKey.textContent = diagnostics.key ?? '-';
  ui.diagMode.textContent = diagnostics.mode ?? '-';
  ui.diagChord.textContent = diagnostics.chord ?? '-';
  ui.diagActivity.textContent = diagnostics.rawActivity?.toFixed(2) ?? '-';
  ui.diagSmoothing.textContent =
    diagnostics.smoothingAttack !== undefined && diagnostics.smoothingRelease !== undefined
      ? `${diagnostics.smoothingAttack.toFixed(2)} / ${diagnostics.smoothingRelease.toFixed(2)}`
      : '-';
  ui.diagSinceEvent.textContent =
    diagnostics.timeSinceEvent !== undefined ? `${diagnostics.timeSinceEvent.toFixed(0)}ms` : '-';
}

function updateHarmonyDisplay(harmony) {
  if (!harmony) return;
  const rootName = NOTE_NAMES[harmony.root] ?? harmony.root;
  ui.harmonyRoot.textContent = rootName;
  ui.harmonyMode.textContent = harmony.mode ?? '-';
  ui.harmonyTension.textContent = harmony.tension?.toFixed(2) ?? '-';
}

function triggerNavEvent(sectionId) {
  safeEngineCall(() => engine.set_section(sectionId), 'set section');
  const events = safeEngineEvent({ type: 'nav', sectionId }, 'nav event');
  events.forEach(handleEvent);
}

function triggerHoverEvent(type, hoverId) {
  const events = safeEngineEvent({ type, hoverId }, `${type} event`);
  if (type === 'hoverStart') {
    const chordEvent = events.find(event => event.type === 'padChord');
    if (chordEvent) {
      const notes = chordEvent.notes.map(n => Tone.Frequency(n, 'midi').toNote());
      playHoverChord(notes, chordEvent.vel);
    }
    events.forEach(logEvent);
    return;
  }

  if (type === 'hoverEnd') {
    endHoverChord();
    events.forEach(logEvent);
    return;
  }

  events.forEach(handleEvent);
}

function triggerClickEvent(x, y) {
  const events = safeEngineEvent(
    {
      type: 'click',
      x,
      y,
      targetId: 0,
    },
    'click event'
  );
  events.forEach(handleEvent);
}

function setupControls() {
  const updateModRate = () => {
    const rate = Number(ui.modulationRate.value);
    ui.modRateValue.textContent = rate.toFixed(2);
    safeEngineCall(() => engine.set_modulation_rate(rate), 'set modulation rate');
  };

  const updateClickX = () => {
    ui.clickXValue.textContent = Number(ui.clickX.value).toFixed(2);
  };

  const updateClickY = () => {
    ui.clickYValue.textContent = Number(ui.clickY.value).toFixed(2);
  };

  ui.engineEnabled.addEventListener('change', () => {
    safeEngineCall(() => engine.set_enabled(ui.engineEnabled.checked), 'set enabled');
  });

  ui.diagnosticsEnabled.addEventListener('change', () => {
    safeEngineCall(() => engine.set_diagnostics(ui.diagnosticsEnabled.checked), 'set diagnostics');
    updateDiagnosticsStatus(ui.diagnosticsEnabled.checked);
  });

  ui.presetSelect.addEventListener('change', () => {
    safeEngineCall(() => engine.set_preset(ui.presetSelect.value), 'set preset');
  });

  ui.applyScale.addEventListener('click', () => {
    safeEngineCall(
      () => engine.set_scale(ui.scaleRoot.value, ui.scaleMode.value),
      'set scale'
    );
  });

  ui.applyChords.addEventListener('click', () => {
    const chords = parseChordPool(ui.chordPool.value);
    if (!chords.length) return;
    safeEngineCall(() => engine.set_chord_pool(chords), 'set chord pool');
  });

  ui.modulationRate.addEventListener('input', updateModRate);
  ui.clickX.addEventListener('input', updateClickX);
  ui.clickY.addEventListener('input', updateClickY);

  ui.triggerClick.addEventListener('click', () => {
    triggerClickEvent(Number(ui.clickX.value), Number(ui.clickY.value));
  });

  ui.triggerNav.addEventListener('click', () => {
    const sectionId = Number(ui.sectionIdInput.value) || 0;
    currentSection = sectionId;
    triggerNavEvent(sectionId);
  });

  ui.hoverStartBtn.addEventListener('click', () => {
    const hoverId = Number(ui.hoverIdInput.value) || 0;
    currentHoverId = hoverId;
    triggerHoverEvent('hoverStart', hoverId);
  });

  ui.hoverEndBtn.addEventListener('click', () => {
    const hoverId = Number(ui.hoverIdInput.value) || 0;
    currentHoverId = 0;
    triggerHoverEvent('hoverEnd', hoverId);
  });

  updateModRate();
  updateClickX();
  updateClickY();
  updateDiagnosticsStatus(ui.diagnosticsEnabled.checked);
}

function applyControlDefaults() {
  safeEngineCall(() => engine.set_enabled(ui.engineEnabled.checked), 'set enabled');
  safeEngineCall(() => engine.set_diagnostics(ui.diagnosticsEnabled.checked), 'set diagnostics');
  safeEngineCall(() => engine.set_preset(ui.presetSelect.value), 'set preset');
  safeEngineCall(
    () => engine.set_scale(ui.scaleRoot.value, ui.scaleMode.value),
    'set scale'
  );
  const chords = parseChordPool(ui.chordPool.value);
  if (chords.length) {
    safeEngineCall(() => engine.set_chord_pool(chords), 'set chord pool');
  }
  const rate = Number(ui.modulationRate.value);
  safeEngineCall(() => engine.set_modulation_rate(rate), 'set modulation rate');
}

// Initialize audio and engine
async function init() {
  if (isStarted) return;

  ui.startBtn.textContent = 'Loading Engine...';
  ui.startBtn.disabled = true;

  try {
    await initWasm();
  } catch (error) {
    console.error('Failed to initialize WASM engine', error);
    ui.startBtn.textContent = 'WASM Load Failed';
    return;
  }

  // Initialize Tone.js
  await Tone.start();
  if (Tone.context.state !== 'running') {
    await Tone.context.resume();
  }

  limiter = new Tone.Limiter(-1).toDestination();
  compressor = new Tone.Compressor({
    threshold: -18,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
  }).connect(limiter);

  // Create synth for plucks
  reverb = new Tone.Reverb({ decay: 2.2, wet: 0.35 }).connect(compressor);

  synth = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1.8,
    modulationIndex: 8,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.25, sustain: 0.2, release: 0.5 },
    modulation: { type: 'triangle' },
    modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.4 },
  }).connect(reverb);

  navGainA = new Tone.Volume(-60).connect(reverb);
  navGainB = new Tone.Volume(-60).connect(reverb);
  hoverGain = new Tone.Volume(-30).connect(reverb);

  navSynthA = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1.5,
    modulationIndex: 5,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.6, decay: 0.8, sustain: 0.6, release: 1.8 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.3, decay: 0.8, sustain: 0.4, release: 1.4 },
  }).connect(navGainA);

  navSynthB = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1.5,
    modulationIndex: 5,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.6, decay: 0.8, sustain: 0.6, release: 1.8 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.3, decay: 0.8, sustain: 0.4, release: 1.4 },
  }).connect(navGainB);

  hoverSynth = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1.3,
    modulationIndex: 4,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.3, decay: 0.6, sustain: 0.7, release: 1.6 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.25, decay: 0.5, sustain: 0.5, release: 1.2 },
  }).connect(hoverGain);

  holdSynth = new Tone.MonoSynth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.85, release: 0.8 },
    filter: { type: 'lowpass', rolloff: -24, Q: 1 },
    filterEnvelope: {
      attack: 0.02,
      decay: 0.3,
      sustain: 0.4,
      release: 0.8,
      baseFrequency: 240,
      octaves: 2.8,
    },
    portamento: 0.05,
  }).connect(reverb);

  // Create the SonicUX engine
  // In production: import { SonicEngine } from 'sonic-ux';
  engine = new SonicEngine(42n, 'ambient');
  applyControlDefaults();

  isStarted = true;
  ui.startBtn.textContent = 'Audio Started!';
  ui.startBtn.disabled = true;

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

  const scrollRange = Math.max(1, document.body.scrollHeight - window.innerHeight);

  // Create interaction frame
  const frame = {
    tMs: Math.trunc(performance.now()),
    viewportW: Math.round(window.innerWidth),
    viewportH: Math.round(window.innerHeight),
    pointerX: mouseX,
    pointerY: mouseY,
    pointerSpeed: mouseSpeed,
    pointerDown: pointerDown ? 1 : 0,
    scrollY: scrollY / scrollRange,
    scrollV: scrollV,
    hoverId: Math.max(0, Math.round(currentHoverId)),
    sectionId: Math.max(0, Math.round(currentSection)),
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
  updateHarmonyDisplay(output.harmony);
  updateDiagnosticsDisplay(output.diagnostics);
  handleHold(output.hold);

  requestAnimationFrame(tick);
}

// Apply continuous params to audio
function applyParams(params) {
  const masterDb = -14 + params.master * 12;
  synth.volume.value = masterDb;
  navTargetDb = masterDb - 8;
  hoverTargetDb = masterDb - 12;
  if (holdSynth) {
    holdSynth.volume.value = masterDb - 4;
  }

  if (navGainA) {
    if (navGainA.volume.value > -50) navGainA.volume.rampTo(navTargetDb, 0.05);
    if (navGainB.volume.value > -50) navGainB.volume.rampTo(navTargetDb, 0.05);
  }
  if (hoverGain) {
    hoverGain.volume.rampTo(hoverTargetDb, 0.05);
  }

  reverb.wet.value = 0.15 + params.reverb * 0.35;
}

function playNavChord(notes, velocity) {
  if (!navSynthA || !navSynthB) return;

  const nextIndex = activeNavIndex === 0 ? 1 : 0;
  const prevIndex = activeNavIndex;
  const nextSynth = nextIndex === 0 ? navSynthA : navSynthB;
  const nextGain = nextIndex === 0 ? navGainA : navGainB;
  const prevSynth = prevIndex === 0 ? navSynthA : navSynthB;
  const prevGain = prevIndex === 0 ? navGainA : navGainB;
  const prevNotes = navNotes[prevIndex];

  if (navReleaseTimeouts[nextIndex]) {
    clearTimeout(navReleaseTimeouts[nextIndex]);
    navReleaseTimeouts[nextIndex] = null;
  }
  if (navHoldTimeouts[nextIndex]) {
    clearTimeout(navHoldTimeouts[nextIndex]);
    navHoldTimeouts[nextIndex] = null;
  }
  nextSynth.releaseAll();
  nextGain.volume.value = -60;
  nextSynth.triggerAttack(notes, undefined, velocity);
  nextGain.volume.rampTo(navTargetDb, NAV_FADE_SEC);

  if (prevNotes) {
    prevGain.volume.rampTo(-60, NAV_FADE_SEC);
    if (navReleaseTimeouts[prevIndex]) {
      clearTimeout(navReleaseTimeouts[prevIndex]);
    }
    if (navHoldTimeouts[prevIndex]) {
      clearTimeout(navHoldTimeouts[prevIndex]);
      navHoldTimeouts[prevIndex] = null;
    }
    navReleaseTimeouts[prevIndex] = setTimeout(() => {
      prevSynth.triggerRelease(prevNotes);
      navNotes[prevIndex] = null;
      navReleaseTimeouts[prevIndex] = null;
    }, NAV_FADE_SEC * 1000);
  }

  navHoldTimeouts[nextIndex] = setTimeout(() => {
    nextGain.volume.rampTo(-60, NAV_FADE_SEC);
    navReleaseTimeouts[nextIndex] = setTimeout(() => {
      nextSynth.triggerRelease(notes);
      navNotes[nextIndex] = null;
      navReleaseTimeouts[nextIndex] = null;
    }, NAV_FADE_SEC * 1000);
    navHoldTimeouts[nextIndex] = null;
  }, NAV_HOLD_SEC * 1000);

  navNotes[nextIndex] = notes;
  activeNavIndex = nextIndex;
}

function playHoverChord(notes, velocity) {
  if (!hoverSynth || !hoverGain) return;
  if (hoverNotes) {
    hoverSynth.triggerRelease(hoverNotes);
  }
  hoverNotes = notes;
  hoverGain.volume.rampTo(hoverTargetDb, 0.05);
  hoverSynth.triggerAttack(notes, undefined, velocity);
}

function endHoverChord() {
  if (!hoverSynth || !hoverNotes) return;
  hoverSynth.triggerRelease(hoverNotes);
  hoverNotes = null;
}

function handleHold(hold) {
  if (!holdSynth) return;

  if (hold) {
    const freq = Tone.Frequency(hold.note, 'midi').toFrequency();
    if (!holdActive) {
      holdSynth.triggerAttack(freq, undefined, hold.vel);
      holdActive = true;
      holdNote = hold.note;
      return;
    }

    if (hold.note !== holdNote) {
      holdSynth.frequency.rampTo(freq, 0.06);
      holdNote = hold.note;
    }
    return;
  }

  if (holdActive) {
    holdSynth.triggerRelease();
    holdActive = false;
    holdNote = null;
  }
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
      playNavChord(notes, event.vel);
      break;

    case 'accent':
      // Could trigger percussion here
      break;

    case 'mute':
      if (event.on) {
        synth.releaseAll();
        navSynthA?.releaseAll();
        navSynthB?.releaseAll();
        hoverSynth?.releaseAll();
        if (holdSynth) {
          holdSynth.triggerRelease();
          holdActive = false;
          holdNote = null;
        }
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
setupControls();
ui.startBtn.addEventListener('click', init);

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
});

document.addEventListener('pointerdown', (e) => {
  if (e.button === 0) {
    pointerDown = true;
  }
});

document.addEventListener('pointerup', () => {
  pointerDown = false;
});

document.addEventListener('pointercancel', () => {
  pointerDown = false;
});

window.addEventListener('blur', () => {
  pointerDown = false;
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
        triggerNavEvent(index);
      }
    }
  });
});

document.addEventListener('click', (e) => {
  if (!isStarted) return;

  const x = e.clientX / window.innerWidth;
  const y = e.clientY / window.innerHeight;

  triggerClickEvent(x, y);
});

// Hover tracking
document.querySelectorAll('[data-hover-id]').forEach((el) => {
  el.addEventListener('mouseenter', () => {
    const hoverId = Number(el.dataset.hoverId) || 0;
    currentHoverId = hoverId;
    if (isStarted) {
      triggerHoverEvent('hoverStart', hoverId);
    }
  });
  el.addEventListener('mouseleave', () => {
    currentHoverId = 0;
    if (isStarted) {
      const hoverId = Number(el.dataset.hoverId) || 0;
      triggerHoverEvent('hoverEnd', hoverId);
    }
  });
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isStarted) {
    synth.releaseAll();
    navSynthA?.releaseAll();
    navSynthB?.releaseAll();
    hoverSynth?.releaseAll();
    if (holdSynth) {
      holdSynth.triggerRelease();
      holdActive = false;
      holdNote = null;
    }
  }
});
