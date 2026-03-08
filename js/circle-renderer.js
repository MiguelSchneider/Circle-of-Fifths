/**
 * SVG rendering for the Circle of Fifths diagram.
 * Builds the full SVG innerHTML string from current state.
 */

import { KEYS, CENTER, RADIUS_OUTER, RADIUS_INNER } from "./constants.js";
import { escapeHtml } from "./renderers.js";
import { translateNote } from "./music-theory.js";

// --- Geometry helpers ---

function degToRad(d) { return d * Math.PI / 180; }
function normDeg(d) { d %= 360; if (d < 0) d += 360; return d; }

function polarPos(i, radius, rotation) {
  const ang = -90 + i * 30 + rotation;
  const th = degToRad(ang);
  return {
    x: CENTER + Math.cos(th) * radius,
    y: CENTER + Math.sin(th) * radius,
    ang: normDeg(ang),
  };
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function roleToColor(role) {
  const map = {
    tonic: "--tonic",
    dominant: "--dominant",
    subdominant: "--subdominant",
    diatonic: "--diatonic",
  };
  return getCssVar(map[role] || "--nondiatonic");
}

// --- SVG building ---

function buildNodeMarkup(i, radius, ringMode, state) {
  const { selectedIndex, selectedMode, chordByKey, diatonicPositions, rotation } = state;
  const p = polarPos(i, radius, rotation);
  const k = KEYS[i];

  const isSelected = (i === selectedIndex && ringMode === selectedMode);
  const isRelative = (i === selectedIndex && ringMode !== selectedMode);
  const chordEntry = chordByKey.get(`${ringMode}-${i}`);
  const isDiatonic = diatonicPositions.has(i);

  let role, numeral;
  if (chordEntry) {
    role = chordEntry.role;
    numeral = chordEntry.numeral;
  } else if (isDiatonic) {
    role = "diatonic";
    numeral = "";
  } else {
    role = "nondiatonic";
    numeral = "";
  }

  const circleFill = roleToColor(role);
  const label = translateNote((ringMode === "major") ? k.major : k.minor);
  const r = isSelected ? 17 : (isRelative ? 14 : 12);

  const isColored = role !== "nondiatonic" || isSelected;
  const textFill = isColored ? "#0a0a0a" : "rgba(255,255,255,0.92)";
  const textHalo = isColored ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.7)";

  let circStroke, circStrokeW;
  if (isSelected) {
    circStroke = "rgba(255,255,255,0.7)";
    circStrokeW = 2.5;
  } else if (isRelative) {
    circStroke = "rgba(255,255,255,0.45)";
    circStrokeW = 2;
  } else {
    circStroke = "rgba(255,255,255,0.18)";
    circStrokeW = 1.5;
  }

  const numeralRadius = radius + (ringMode === "major" ? 20 : -20);
  const pNum = polarPos(i, numeralRadius, rotation);
  const haloAttrs = `stroke="${textHalo}" stroke-width="3" paint-order="stroke" stroke-linejoin="round"`;

  let markup = "";
  markup += `<circle class="node-circle" cx="${p.x}" cy="${p.y}" r="${r}"
    fill="${circleFill}" stroke="${circStroke}" stroke-width="${circStrokeW}"
    data-i="${i}" data-ring="${ringMode}"/>`;
  markup += `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central"
    font-size="${isSelected ? 12 : 11}" font-weight="700"
    fill="${textFill}" ${haloAttrs} pointer-events="none">
    ${escapeHtml(label)}
  </text>`;

  if (numeral) {
    const numFill = roleToColor(role);
    markup += `<text x="${pNum.x}" y="${pNum.y}" text-anchor="middle" dominant-baseline="central"
      font-size="10" font-weight="800"
      fill="${numFill}" stroke="rgba(0,0,0,0.6)" stroke-width="3" paint-order="stroke" stroke-linejoin="round"
      pointer-events="none">
      ${escapeHtml(numeral)}
    </text>`;
  }

  return markup;
}

function buildProgressionArrows(state) {
  const { progression, degreeMap, rotation, isProgPlaying, progPlaybackIndex } = state;
  if (progression.length <= 1) return "";

  let s = "";

  // Glow rings around chord positions
  const drawnRings = new Set();
  for (const deg of progression) {
    const pos = degreeMap[deg];
    if (!pos) continue;
    const key = `${pos.idx}-${pos.ring}`;
    if (drawnRings.has(key)) continue;
    drawnRings.add(key);
    const rr = pos.ring === "major" ? RADIUS_OUTER : RADIUS_INNER;
    const p = polarPos(pos.idx, rr, rotation);
    s += `<circle cx="${p.x}" cy="${p.y}" r="20" fill="none" stroke="rgba(0,210,255,0.25)" stroke-width="1.5" pointer-events="none"/>`;
  }

  // Curved arrows between consecutive chords
  for (let j = 0; j < progression.length; j++) {
    const from = degreeMap[progression[j]];
    const to = degreeMap[progression[(j + 1) % progression.length]];
    if (!from || !to) continue;

    const pFrom = polarPos(from.idx, from.ring === "major" ? RADIUS_OUTER : RADIUS_INNER, rotation);
    const pTo = polarPos(to.idx, to.ring === "major" ? RADIUS_OUTER : RADIUS_INNER, rotation);
    const dx = pTo.x - pFrom.x, dy = pTo.y - pFrom.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) continue;

    const nodeR = 15;
    const ux = dx / dist, uy = dy / dist;
    const x1 = pFrom.x + ux * nodeR, y1 = pFrom.y + uy * nodeR;
    const x2 = pTo.x - ux * nodeR, y2 = pTo.y - uy * nodeR;

    // Curve outward from center
    const mx = (pFrom.x + pTo.x) / 2, my = (pFrom.y + pTo.y) / 2;
    const fcx = mx - CENTER, fcy = my - CENTER;
    const fcLen = Math.sqrt(fcx * fcx + fcy * fcy) || 1;
    const curv = Math.max(10, Math.min(dist * 0.2, 22));
    const cpx = mx + (fcx / fcLen) * curv, cpy = my + (fcy / fcLen) * curv;

    const isActive = isProgPlaying && j === progPlaybackIndex;
    const color = isActive ? "rgba(0,210,255,0.9)" : "rgba(0,210,255,0.4)";
    const w = isActive ? 3 : 2;
    const mkr = isActive ? "progArrowActive" : "progArrow";

    s += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${w}" marker-end="url(#${mkr})" pointer-events="none"/>`;
  }

  return s;
}

/**
 * Build the complete SVG innerHTML for the circle of fifths.
 * @param {object} state — must include: selectedIndex, selectedMode, rotation,
 *   chain, chordByKey, diatonicPositions, progression, degreeMap, isProgPlaying, progPlaybackIndex
 */
export function buildCircleSvg(state) {
  const { selectedIndex, rotation, chain } = state;
  let s = "";

  // SVG defs for arrow markers
  s += `<defs>
    <marker id="progArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0,210,255,0.6)"/>
    </marker>
    <marker id="progArrowActive" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0,210,255,1)"/>
    </marker>
  </defs>`;

  // Background circles + center dot
  s += `<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS_OUTER}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>`;
  s += `<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS_INNER}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>`;
  s += `<circle cx="${CENTER}" cy="${CENTER}" r="6" fill="rgba(255,255,255,0.40)"/>`;

  // Tick marks
  for (let i = 0; i < 12; i++) {
    const th = degToRad(-90 + i * 30 + rotation);
    const cos = Math.cos(th), sin = Math.sin(th);
    s += `<line x1="${CENTER + cos * (RADIUS_OUTER - 12)}" y1="${CENTER + sin * (RADIUS_OUTER - 12)}"
      x2="${CENTER + cos * (RADIUS_OUTER + 12)}" y2="${CENTER + sin * (RADIUS_OUTER + 12)}"
      stroke="rgba(255,255,255,0.14)" stroke-width="2"/>`;
  }

  // Connecting line between selected major/minor
  const pOuter = polarPos(selectedIndex, RADIUS_OUTER, rotation);
  const pInner = polarPos(selectedIndex, RADIUS_INNER, rotation);
  s += `<line x1="${pOuter.x}" y1="${pOuter.y}" x2="${pInner.x}" y2="${pInner.y}"
    stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="4 3"/>`;

  // Diatonic arc lines
  const positions = [...chain.positions];
  for (let j = 0; j < positions.length - 1; j++) {
    const pA = polarPos(positions[j], RADIUS_OUTER, rotation);
    const pB = polarPos(positions[j + 1], RADIUS_OUTER, rotation);
    s += `<line x1="${pA.x}" y1="${pA.y}" x2="${pB.x}" y2="${pB.y}"
      stroke="rgba(255,215,122,0.12)" stroke-width="1"/>`;
  }

  // Progression arrows (before nodes so they render behind)
  s += buildProgressionArrows(state);

  // Key nodes: outer ring (major), then inner ring (minor)
  for (let i = 0; i < 12; i++) s += buildNodeMarkup(i, RADIUS_OUTER, "major", state);
  for (let i = 0; i < 12; i++) s += buildNodeMarkup(i, RADIUS_INNER, "minor", state);

  return s;
}

// --- Drag rotation helpers (exported for use by event handlers) ---

export function pointerAngleOnSvg(evt, svgEl) {
  const rect = svgEl.getBoundingClientRect();
  const svgSize = 420; // matches viewBox
  const x = ((evt.clientX - rect.left) / rect.width) * svgSize - CENTER;
  const y = ((evt.clientY - rect.top) / rect.height) * svgSize - CENTER;
  return Math.atan2(y, x) * 180 / Math.PI;
}

export function shortestAngleDelta(d) {
  return ((d + 540) % 360) - 180;
}
