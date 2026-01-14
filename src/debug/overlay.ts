import type { DebugInfo, NoteEvent } from '../types';

export class DebugOverlay {
  private container?: HTMLElement;
  private recentNotes: NoteEvent[] = [];
  private maxNotes = 10;

  show(): void {
    if (this.container) return;

    // Create overlay container
    this.container = document.createElement('div');
    this.container.id = 'sonic-ux-debug';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 15px;
      border-radius: 8px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    `;

    document.body.appendChild(this.container);
    this.render({
      harmony: { key: '', mode: '', scale: [], chord: [], isLocked: false },
      activeVoices: 0,
      recentNotes: [],
      activeBehaviors: []
    });
  }

  hide(): void {
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = undefined;
    }
  }

  update(info: DebugInfo): void {
    if (!this.container) return;
    this.render(info);
  }

  addNote(note: NoteEvent): void {
    this.recentNotes.unshift(note);
    if (this.recentNotes.length > this.maxNotes) {
      this.recentNotes = this.recentNotes.slice(0, this.maxNotes);
    }
  }

  private render(info: DebugInfo): void {
    if (!this.container) return;

    const scaleNotes = this.formatScale(info.harmony.scale);
    const chordNotes = this.formatNotes(info.harmony.chord);

    this.container.innerHTML = `
      <div style="margin-bottom: 10px; border-bottom: 1px solid #00ff00; padding-bottom: 5px;">
        <strong>🎵 SONIC-UX DEBUG</strong>
      </div>

      <div style="margin-bottom: 8px;">
        <div><strong>Harmony:</strong></div>
        <div style="padding-left: 10px;">
          Key: ${info.harmony.key} ${info.harmony.mode}
          <br/>Scale: ${scaleNotes}
          <br/>Chord: ${chordNotes}
          ${info.harmony.isLocked ? '<br/><span style="color: #ff0000;">🔒 LOCKED</span>' : ''}
        </div>
      </div>

      <div style="margin-bottom: 8px;">
        <div><strong>Audio:</strong></div>
        <div style="padding-left: 10px;">
          Active Voices: ${info.activeVoices}
        </div>
      </div>

      <div style="margin-bottom: 8px;">
        <div><strong>Behaviors:</strong></div>
        <div style="padding-left: 10px;">
          ${info.activeBehaviors.map(b => `${b.name}: ${b.elementCount} elements`).join('<br/>') || 'None'}
        </div>
      </div>

      <div>
        <div><strong>Recent Notes:</strong></div>
        <div style="padding-left: 10px; font-size: 10px; color: #00dd00;">
          ${this.recentNotes.map(n => this.formatNoteEvent(n)).join('<br/>') || 'No notes yet'}
        </div>
      </div>
    `;
  }

  private formatScale(scale: number[]): string {
    if (!scale || scale.length === 0) return '[]';
    return `[${scale.join(', ')}]`;
  }

  private formatNotes(notes: number[]): string {
    if (!notes || notes.length === 0) return '[]';
    return notes.map(n => this.midiToNoteName(n)).join(', ');
  }

  private formatNoteEvent(note: NoteEvent): string {
    const noteName = this.midiToNoteName(note.note);
    const velocity = (note.velocity * 100).toFixed(0);
    const voice = note.voice || '?';
    return `${noteName} [${velocity}%] (${voice})`;
  }

  private midiToNoteName(midi: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
  }
}
