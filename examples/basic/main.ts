import SonicUX from '../../src/index';

let sonic: SonicUX;

// Initialize sonic-ux
async function init() {
  sonic = await SonicUX.create({
    key: 'C',
    mode: 'minor',
    preset: 'ambient',
    masterVolume: -12,
  });

  console.log('sonic-ux initialized');

  // Wire up all behaviors
  wireUpBehaviors();

  // Wire up controls
  wireUpControls();

  // Setup event listeners
  setupEventListeners();
}

function wireUpBehaviors() {
  // Pluck behavior - buttons trigger notes
  sonic.pluck('.pluck-btn', {
    voice: 'bell',
    velocity: 0.7,
    noteSelection: 'sequential',
    octave: 5
  });

  // Continuous behavior - drag to control pitch and filter
  sonic.continuous('.interactive-area', {
    xAxis: 'pitch',
    yAxis: 'filter',
    portamento: 0.05,
    voice: 'synth',
    octave: 4
  });

  // Arpeggio behavior - hold to play pattern
  sonic.arpeggio('.draggable', {
    pattern: 'upDown',
    speed: '8n',
    notes: [0, 2, 4, 7],
    voice: 'bell',
    octave: 5
  });

  // Hover sound behavior - menu items
  sonic.hoverSound('.menu-item', {
    enter: 0,
    exit: 2,
    voice: 'bell'
  });

  // Chord pad behavior - cards
  sonic.chordPad('.card', {
    chord: 'i',
    voice: 'pad',
    fadeIn: 0.3,
    fadeOut: 0.5
  });

  // Drone - ambient background layer
  sonic.drone.start({
    chord: 'i',
    voices: 3,
    mousePosition: true,
    mouseVelocity: 0.2,
    volume: -20
  });

  // Setup section-based drone chord changes
  sonic.drone.sections([
    { selector: '#hero', chord: 'i' },
    { selector: '#pluck-demo', chord: 'iv' },
    { selector: '#continuous-demo', chord: 'v' },
    { selector: '#arpeggio-demo', chord: 'VI' },
    { selector: '#hover-demo', chord: 'III' },
    { selector: '#chord-demo', chord: 'VII' },
    { selector: '#controls', chord: 'i' }
  ]);
}

function wireUpControls() {
  // Key selector
  const keySelect = document.querySelector('#key-select') as HTMLSelectElement;
  keySelect.addEventListener('change', (e) => {
    const key = (e.target as HTMLSelectElement).value;
    sonic.setKey(key, 'minor');
    console.log(`Changed key to ${key} minor`);
  });

  // Preset selector
  const presetSelect = document.querySelector('#preset-select') as HTMLSelectElement;
  presetSelect.addEventListener('change', (e) => {
    const preset = (e.target as HTMLSelectElement).value;
    sonic.setPreset(preset);
    console.log(`Changed preset to ${preset}`);
  });

  // Debug toggle
  const debugToggle = document.querySelector('#debug-toggle') as HTMLButtonElement;
  let debugEnabled = false;
  debugToggle.addEventListener('click', () => {
    debugEnabled = !debugEnabled;
    sonic.debug(debugEnabled);
    debugToggle.textContent = debugEnabled ? 'Disable Debug Mode' : 'Enable Debug Mode';
  });
}

function setupEventListeners() {
  // Listen to note play events
  sonic.on('notePlay', (note) => {
    console.log('Note played:', note);
  });

  // Listen to chord changes
  sonic.on('chordChange', (chord) => {
    console.log('Chord changed:', chord);
  });

  // Listen to key changes
  sonic.on('keyChange', (data) => {
    console.log('Key changed:', data);
  });
}

// Audio unlock flow
const unlockPrompt = document.querySelector('#unlock-prompt') as HTMLElement;
const unlockBtn = document.querySelector('#unlock-btn') as HTMLButtonElement;

unlockBtn.addEventListener('click', async () => {
  // Initialize sonic-ux
  await init();

  // Unlock audio context
  await sonic.unlock();

  // Hide unlock prompt
  unlockPrompt.classList.add('hidden');

  console.log('Audio unlocked and ready');
});
