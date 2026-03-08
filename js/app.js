/**
 * Main application entry point.
 * Manages selection state, wires up events, and orchestrates rendering.
 */

import { KEYS, ARPEGGIO_PATTERNS } from "./constants.js";
import {
  pickSpelling, stripMinorSuffix, buildScale, buildTriads,
  chainMapMajor, chainMapMinor, prefersFlats, degreeToCirclePos,
} from "./music-theory.js";
import { playWithPattern, preload, isLoaded } from "./audio-engine.js";
import { escapeHtml, notesToPianoData, renderPiano } from "./renderers.js";
import { buildCircleSvg, pointerAngleOnSvg, shortestAngleDelta } from "./circle-renderer.js";
import { ProgressionBuilder } from "./progression.js";

// --- Application state ---

let selectedIndex = 0;
let selectedMode = "major"; // "major" | "minor"
let rotation = 0;

// --- DOM references ---

const svg = document.getElementById("svg");
const modeLabel = document.getElementById("modeLabel");
const infoEl = document.getElementById("info");
const chordsBody = document.getElementById("chordsBody");

// --- Progression builder ---

const prog = new ProgressionBuilder({ onRender: render });

prog.bindDOM({
  presets: document.getElementById("progPresets"),
  builder: document.getElementById("progBuilder"),
  sequence: document.getElementById("progSequence"),
  controls: document.getElementById("progControls"),
  playBtn: document.getElementById("progPlayBtn"),
  bpmSlider: document.getElementById("bpmSlider"),
  bpmLabel: document.getElementById("bpmLabel"),
  clearBtn: document.getElementById("progClearBtn"),
  arpeggioGrid: document.getElementById("arpeggioGrid"),
  instrumentGrid: document.getElementById("instrumentGrid"),
  sustainToggle: document.getElementById("sustainToggle"),
});

// --- Main render ---

function render() {
  const keyObj = KEYS[selectedIndex];
  const isMajor = selectedMode === "major";
  modeLabel.textContent = `Mode: ${isMajor ? "Major" : "Relative Minor"}`;

  const useFlats = prefersFlats(keyObj);
  const tonicLabel = isMajor
    ? pickSpelling(keyObj.major, useFlats)
    : stripMinorSuffix(pickSpelling(keyObj.minor, useFlats));

  const chain = isMajor ? chainMapMajor(selectedIndex) : chainMapMinor(selectedIndex);
  const diatonicPositions = new Set(chain.positions);
  const chordByKey = new Map(chain.chords.map(c => [`${c.ring}-${c.idx}`, c]));
  const triads = buildTriads(tonicLabel, useFlats, isMajor);
  const degreeMap = degreeToCirclePos(chain, isMajor);

  // Update progression builder context
  prog.setContext(triads, isMajor);

  // --- Info panel ---
  const scaleNotes = buildScale(tonicLabel, useFlats, isMajor);
  const scalePiano = notesToPianoData(scaleNotes);
  const displayName = isMajor ? keyObj.major : keyObj.minor;
  const relLabel = isMajor ? keyObj.minor : keyObj.major;

  infoEl.innerHTML = `
    <div><strong style="font-size:18px;">${displayName}</strong>
      <span class="muted" style="margin-left:8px;">(relative: ${relLabel})</span>
    </div>
    <div style="margin-top:8px; font-size:13px; color:var(--muted);">Scale notes:</div>
    <div class="scale-notes">
      ${scaleNotes.map((n, i) => `<span class="scale-note${i === 0 ? ' root' : ''}">${n}</span>`).join("")}
    </div>
    ${renderPiano(scalePiano.pcs, scalePiano.pcToLabel, scalePiano.rootPc, "full")}
  `;

  // --- Chord table ---
  chordsBody.innerHTML = triads.map((t) => {
    const cp = notesToPianoData(t.tones);
    return `
      <tr>
        <td class="chord-grade mono"><strong>${t.numeral}</strong></td>
        <td class="chord-name"><strong>${t.chord}</strong></td>
        <td class="chord-piano-cell">
          ${renderPiano(cp.pcs, cp.pcToLabel, cp.rootPc, "mini")}
          <span class="mono" style="color:rgba(255,255,255,0.5);font-size:12px;">${t.tones.join(" — ")}</span>
        </td>
        <td style="text-align:right; vertical-align:middle;">
          <button class="playBtn" data-tones="${t.tones.join(",")}" title="Play ${t.chord} chord">&#x1f50a; Play</button>
        </td>
      </tr>`;
  }).join("");

  // --- SVG circle ---
  svg.innerHTML = buildCircleSvg({
    selectedIndex, selectedMode, rotation, chain,
    chordByKey, diatonicPositions,
    progression: prog.progression,
    degreeMap,
    isProgPlaying: prog.isPlaying,
    progPlaybackIndex: prog.playbackIndex,
  });

  // Highlight active chord row during playback
  if (prog.isPlaying && prog.playbackIndex >= 0 && prog.playbackIndex < prog.progression.length) {
    const activeDeg = prog.progression[prog.playbackIndex];
    const rows = chordsBody.querySelectorAll("tr");
    if (rows[activeDeg]) rows[activeDeg].classList.add("chord-row-active");
  }

  // Render progression builder UI
  prog.render();

  // Update audio loading status
  const audioStatus = document.getElementById("audioStatus");
  if (audioStatus && preloaded) {
    audioStatus.textContent = isLoaded()
      ? "Audio ready — powered by Tone.js with Salamander Grand Piano samples."
      : "Loading piano samples…";
  }
}

// --- SVG drag-to-rotate ---

let dragging = false;
let startAngle = 0;
let startRot = 0;
let downX = 0, downY = 0;
let moved = false;

svg.addEventListener("pointerdown", (e) => {
  const isNode = e.target?.classList?.contains("node-circle");
  moved = false;
  downX = e.clientX;
  downY = e.clientY;

  if (isNode) {
    dragging = false;
    return;
  }

  dragging = true;
  startAngle = pointerAngleOnSvg(e, svg);
  startRot = rotation;
  svg.setPointerCapture?.(e.pointerId);
  svg.classList.add("dragging");
});

window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - downX, dy = e.clientY - downY;
  if (!moved && (dx * dx + dy * dy) > 9) moved = true;
  rotation = startRot + shortestAngleDelta(pointerAngleOnSvg(e, svg) - startAngle);
  render();
});

window.addEventListener("pointerup", () => {
  dragging = false;
  svg.classList.remove("dragging");
});

// --- Node click → select key ---

svg.addEventListener("click", (e) => {
  if (moved) return;
  const t = e.target;
  if (!t?.classList?.contains("node-circle")) return;
  if (t.dataset.i === undefined) return;

  if (prog.isPlaying) prog.stop();
  selectedIndex = Number(t.dataset.i);
  selectedMode = t.dataset.ring === "major" ? "major" : "minor";
  render();
});

// --- Chord play buttons (event delegation) ---

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".playBtn");
  if (!btn) return;
  const tones = btn.dataset.tones.split(",").map(s => s.trim());
  btn.classList.add("playing");
  setTimeout(() => btn.classList.remove("playing"), 600);
  playWithPattern(tones, prog.selectedArpeggio, prog.selectedInstrument, prog.sustainPedal, 2.2);
});

// --- Keyboard shortcuts: 1–7 play diatonic chords ---

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  const deg = parseInt(e.key) - 1;
  if (deg < 0 || deg > 6 || !prog.currentTriads[deg]) return;

  const tones = prog.currentTriads[deg].tones;
  const beatDur = 60 / prog.bpm;
  playWithPattern(tones, prog.selectedArpeggio, prog.selectedInstrument, prog.sustainPedal, beatDur);

  const rows = chordsBody.querySelectorAll("tr");
  if (rows[deg]) {
    rows[deg].classList.add("chord-row-active");
    setTimeout(() => rows[deg].classList.remove("chord-row-active"), 600);
  }
});

// --- Preload audio samples on first interaction ---

let preloaded = false;
document.addEventListener("click", () => {
  if (!preloaded) {
    preloaded = true;
    preload().then(() => render());
  }
}, { once: false });

document.addEventListener("keydown", () => {
  if (!preloaded) {
    preloaded = true;
    preload().then(() => render());
  }
}, { once: false });

// --- Initial render ---
render();
