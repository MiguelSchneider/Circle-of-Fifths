/**
 * Small rendering helpers for UI widgets: piano keyboard, arpeggio roll, waveform preview.
 * Returns HTML strings — no direct DOM mutation.
 */

import { PIANO_WHITE_PCS, PIANO_BLACK_PCS, PIANO_BLACK_POS } from "./constants.js";
import { noteToPc } from "./music-theory.js";

/** Escape special characters for safe HTML/SVG insertion. */
export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Extract pitch classes and labels from an array of note names. */
export function notesToPianoData(noteNames) {
  const pcs = new Set();
  const pcToLabel = new Map();
  for (const name of noteNames) {
    const pc = noteToPc(name);
    pcs.add(pc);
    pcToLabel.set(pc, name);
  }
  return { pcs, pcToLabel, rootPc: noteToPc(noteNames[0]) };
}

/**
 * Render a piano keyboard highlighting specific pitch classes.
 * @param {"mini" | "full"} size
 */
export function renderPiano(highlightPcs, pcToLabel, rootPc, size) {
  const ww = size === "mini" ? 18 : 28;
  const h = size === "mini" ? 46 : 68;
  const bh = size === "mini" ? 27 : 40;
  const bw = size === "mini" ? 12 : 18;
  const fs = size === "mini" ? 8 : 11;
  const bfs = size === "mini" ? 7 : 9;
  const totalW = ww * 7;

  let html = `<div class="piano-kb" style="width:${totalW}px;height:${h}px;">`;

  for (let i = 0; i < 7; i++) {
    const pc = PIANO_WHITE_PCS[i];
    const on = highlightPcs.has(pc);
    const root = pc === rootPc;
    const label = on ? (pcToLabel.get(pc) || "") : "";
    const cls = "pk-w" + (root ? " pk-root" : on ? " pk-on" : "");
    html += `<div class="${cls}" style="width:${ww}px;font-size:${fs}px;">${escapeHtml(label)}</div>`;
  }

  for (let i = 0; i < 5; i++) {
    const pc = PIANO_BLACK_PCS[i];
    const on = highlightPcs.has(pc);
    const root = pc === rootPc;
    const label = on ? (pcToLabel.get(pc) || "") : "";
    const left = PIANO_BLACK_POS[i] * ww - bw / 2;
    const cls = "pk-b" + (root ? " pk-root" : on ? " pk-on" : "");
    html += `<div class="${cls}" style="left:${left}px;width:${bw}px;height:${bh}px;font-size:${bfs}px;">${escapeHtml(label)}</div>`;
  }

  return html + "</div>";
}

/** Render the dot-grid visualization for an arpeggio pattern. */
export function renderArpRoll(steps) {
  const cols = steps.length;
  let html = `<div class="arp-roll" style="grid-template-columns:repeat(${cols},8px);grid-template-rows:repeat(3,8px);">`;
  for (let row = 2; row >= 0; row--)
    for (let col = 0; col < cols; col++)
      html += `<div class="arp-roll-dot${steps[col].includes(row) ? ' on' : ''}"></div>`;
  return html + "</div>";
}

/** Render a tiny SVG waveform preview for an instrument card. */
export function renderWaveformPreview(inst) {
  const w = 48, h = 18, steps = 60;
  let path = "";

  if (inst.synthesis === "ks") {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const decay = Math.exp(-t * 3.5);
      const harm = 3 + (inst.ksHardness || 0.5) * 3;
      const y = decay * (Math.sin(t * Math.PI * harm * 2)
        + 0.3 * Math.sin(t * Math.PI * harm * 4.03));
      const px = t * w;
      const py = h / 2 - y * (h / 2 - 2) / 1.3;
      path += (i === 0 ? "M" : "L") + `${px.toFixed(1)},${py.toFixed(1)}`;
    }
  } else {
    const totalAmp = inst.voices.reduce((s, v) => s + v.amp, 0);
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 4;
      let y = 0;
      for (const v of inst.voices.slice(0, 4)) {
        let wave;
        if (v.type === "sine") {
          wave = Math.sin(t * v.harmonic);
        } else if (v.type === "triangle") {
          const x = t * v.harmonic;
          wave = 2 * Math.abs(2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5))) - 1;
        } else if (v.type === "sawtooth") {
          const x = t * v.harmonic;
          wave = 2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5));
        } else {
          wave = Math.sin(t * v.harmonic) >= 0 ? 1 : -1;
        }
        y += wave * v.amp;
      }
      y /= totalAmp;
      const px = (i / steps) * w;
      const py = h / 2 - y * (h / 2 - 2);
      path += (i === 0 ? "M" : "L") + `${px.toFixed(1)},${py.toFixed(1)}`;
    }
  }

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;margin:2px auto 0;">` +
    `<path d="${path}" fill="none" stroke="rgba(0,210,255,0.6)" stroke-width="1.2"/></svg>`;
}
