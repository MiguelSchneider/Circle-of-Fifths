/**
 * Progression Builder — manages the chord sequence, playback loop, and UI rendering.
 */

import {
  ROMAN_MAJOR, ROMAN_MINOR,
  PROGRESSIONS_MAJOR, PROGRESSIONS_MINOR,
  ARPEGGIO_PATTERNS, INSTRUMENTS,
} from "./constants.js";
import { playWithPattern } from "./audio-engine.js";
import { escapeHtml, renderArpRoll, renderWaveformPreview } from "./renderers.js";

export class ProgressionBuilder {
  constructor({ onRender }) {
    this.progression = [];
    this.isPlaying = false;
    this.playbackIndex = -1;
    this.timer = null;
    this.bpm = 100;
    this.selectedArpeggio = 0;
    this.selectedInstrument = 0;
    this.sustainPedal = true;
    this.currentTriads = [];
    this.isMajor = true;

    // Callback to trigger a full app re-render
    this._onRender = onRender;

    // DOM references (set once via bindDOM)
    this._els = {};
  }

  /** Bind to DOM elements. Call once after DOMContentLoaded. */
  bindDOM(els) {
    this._els = els;
    this._attachEvents();
  }

  /** Update triads and mode when the selected key changes. */
  setContext(triads, isMajor) {
    this.currentTriads = triads;
    this.isMajor = isMajor;
  }

  /** Render the progression builder UI (presets, chord buttons, sequence pills, controls). */
  render() {
    const { isMajor, currentTriads, progression, isPlaying, playbackIndex } = this;
    const els = this._els;
    const presets = isMajor ? PROGRESSIONS_MAJOR : PROGRESSIONS_MINOR;
    const roman = isMajor ? ROMAN_MAJOR : ROMAN_MINOR;

    els.presets.innerHTML = presets.map((p, i) =>
      `<button class="prog-preset-btn" data-preset="${i}" title="${escapeHtml(p.numerals)}">${escapeHtml(p.name)}</button>`
    ).join("");

    els.builder.innerHTML = currentTriads.map((t, d) =>
      `<button class="prog-chord-btn" data-degree="${d}">${escapeHtml(roman[d])} <span style="opacity:0.6">${escapeHtml(t.chord)}</span></button>`
    ).join("");

    if (progression.length > 0) {
      els.sequence.innerHTML = progression.map((deg, i) => {
        const isActive = isPlaying && i === playbackIndex;
        return `<div class="prog-pill${isActive ? ' active' : ''}">
          <span class="prog-pill-num">${escapeHtml(roman[deg])}</span>
          ${escapeHtml(currentTriads[deg].chord)}
          <span class="prog-pill-x" data-remove="${i}">&times;</span>
        </div>`;
      }).join("");
      els.controls.style.display = "flex";
    } else {
      els.sequence.innerHTML = `<div class="muted" style="font-size:12px;">No chords yet — click above or pick a preset</div>`;
      els.controls.style.display = "none";
    }

    els.playBtn.innerHTML = isPlaying ? "&#9724; Stop" : "&#9654; Play";
    els.playBtn.classList.toggle("playing", isPlaying);

    this._renderArpeggioGrid();
    this._renderInstrumentGrid();
  }

  // --- Playback ---

  start() {
    if (this.progression.length === 0) return;
    this.isPlaying = true;
    this.playbackIndex = 0;
    this._playCurrentChord();
  }

  stop() {
    this.isPlaying = false;
    this.playbackIndex = -1;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this._onRender();
  }

  // --- Private ---

  _playCurrentChord() {
    if (!this.isPlaying || this.progression.length === 0) return;
    const deg = this.progression[this.playbackIndex];
    const beatDur = 60 / this.bpm;
    const intervalMs = beatDur * 1000;
    const tones = this.currentTriads[deg].tones;

    playWithPattern(tones, this.selectedArpeggio, this.selectedInstrument, this.sustainPedal, beatDur);

    this._onRender();
    this.timer = setTimeout(() => {
      this.playbackIndex = (this.playbackIndex + 1) % this.progression.length;
      this._playCurrentChord();
    }, intervalMs);
  }

  _renderArpeggioGrid() {
    this._els.arpeggioGrid.innerHTML = ARPEGGIO_PATTERNS.map((pat, i) =>
      `<div class="arpeggio-card${i === this.selectedArpeggio ? ' active' : ''}" data-arp-idx="${i}">
        <div class="arpeggio-card-name">${escapeHtml(pat.name)}</div>
        ${renderArpRoll(pat.steps)}
      </div>`
    ).join("");
  }

  _renderInstrumentGrid() {
    this._els.instrumentGrid.innerHTML = INSTRUMENTS.map((inst, i) =>
      `<div class="instrument-card${i === this.selectedInstrument ? ' active' : ''}" data-inst-idx="${i}">
        ${renderWaveformPreview(inst)}
        <div class="instrument-card-name">${escapeHtml(inst.name)}</div>
      </div>`
    ).join("");
  }

  _attachEvents() {
    const els = this._els;

    // Preset selection
    els.presets.addEventListener("click", (e) => {
      const btn = e.target.closest(".prog-preset-btn");
      if (!btn) return;
      const presets = this.isMajor ? PROGRESSIONS_MAJOR : PROGRESSIONS_MINOR;
      if (this.isPlaying) this.stop();
      this.progression = [...presets[Number(btn.dataset.preset)].degrees];
      this._onRender();
    });

    // Add chord to progression
    els.builder.addEventListener("click", (e) => {
      const btn = e.target.closest(".prog-chord-btn");
      if (!btn) return;
      this.progression.push(Number(btn.dataset.degree));
      this._onRender();
    });

    // Remove chord from progression
    els.sequence.addEventListener("click", (e) => {
      const x = e.target.closest(".prog-pill-x");
      if (!x) return;
      if (this.isPlaying) this.stop();
      this.progression.splice(Number(x.dataset.remove), 1);
      this._onRender();
    });

    // Play/Stop
    els.playBtn.addEventListener("click", () => {
      if (this.isPlaying) this.stop();
      else this.start();
    });

    // BPM slider
    els.bpmSlider.addEventListener("input", () => {
      this.bpm = Number(els.bpmSlider.value);
      els.bpmLabel.textContent = this.bpm;
    });

    // Clear
    els.clearBtn.addEventListener("click", () => {
      if (this.isPlaying) this.stop();
      this.progression = [];
      this._onRender();
    });

    // Arpeggio selection
    els.arpeggioGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".arpeggio-card");
      if (!card) return;
      this.selectedArpeggio = Number(card.dataset.arpIdx);
      this._renderArpeggioGrid();
    });

    // Instrument selection
    els.instrumentGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".instrument-card");
      if (!card) return;
      this.selectedInstrument = Number(card.dataset.instIdx);
      this._renderInstrumentGrid();
    });

    // Sustain pedal toggle
    els.sustainToggle.addEventListener("change", () => {
      this.sustainPedal = els.sustainToggle.checked;
    });
  }
}
