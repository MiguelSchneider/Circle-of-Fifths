/**
 * Pure music theory functions.
 * No DOM access, no state — just pitch math, scale/chord construction, and spelling.
 */

import {
  NOTES_SHARP, NOTES_FLAT, MAJOR_STEPS, NAT_MINOR_STEPS,
  ROMAN_MAJOR, ROMAN_MINOR,
} from "./constants.js";

const BASE_PC_MAP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// --- Note naming (letters vs solfège) ---

const SOLFEGE_MAP = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };

let _noteNaming = "letters"; // "letters" | "solfege"

export function setNoteNaming(mode) { _noteNaming = mode; }
export function getNoteNaming() { return _noteNaming; }

/**
 * Translate a note/chord label to the current naming convention.
 * Handles accidentals, minor suffix, dim, enharmonic slashes, etc.
 * e.g. "F#m" → "Fa#m", "Bb" → "Sib", "F# / Gb" → "Fa# / Solb"
 */
export function translateNote(label) {
  if (_noteNaming === "letters") return label;
  return label.replace(/([A-G])([#b]*)/g, (_, letter, acc) => SOLFEGE_MAP[letter] + acc);
}

/** Modulo 12 that always returns 0–11 (handles negatives). */
export function mod12(n) {
  return ((n % 12) + 12) % 12;
}

/** Convert a note name like "F#" or "Bb" to its pitch class (0–11). */
export function noteToPc(note) {
  const n = note.trim();
  let pc = BASE_PC_MAP[n[0].toUpperCase()];
  for (const ch of n.slice(1)) {
    if (ch === "#") pc += 1;
    if (ch === "b") pc -= 1;
  }
  return mod12(pc);
}

/** Convert a pitch class to a note name, choosing sharps or flats. */
export function pcToNote(pc, preferFlats) {
  return preferFlats ? NOTES_FLAT[pc] : NOTES_SHARP[pc];
}

/**
 * Pick one spelling from an enharmonic label like "F# / Gb".
 * Returns the label as-is if there's no slash.
 */
export function pickSpelling(label, preferFlats) {
  if (!label.includes("/")) return label.trim();
  const [a, b] = label.split("/").map(s => s.trim());
  if (preferFlats) {
    if (a.includes("b")) return a;
    if (b.includes("b")) return b;
    return b;
  }
  if (a.includes("#")) return a;
  if (b.includes("#")) return b;
  return a;
}

/** Strip trailing "m" from a minor key label (e.g. "F#m" → "F#"). */
export function stripMinorSuffix(label) {
  return label.replace(/m$/, "");
}

/** Classify a triad by its third and fifth intervals. */
export function chordQuality(thirdInterval, fifthInterval) {
  if (thirdInterval === 4 && fifthInterval === 7) return "maj";
  if (thirdInterval === 3 && fifthInterval === 7) return "min";
  if (thirdInterval === 3 && fifthInterval === 6) return "dim";
  return "other";
}

/** Format a chord name from root + quality (e.g. "C" + "min" → "Cm"). */
export function formatChord(root, quality) {
  if (quality === "min") return root + "m";
  if (quality === "dim") return root + "dim";
  return root;
}

/** Build an array of 7 scale note names. */
export function buildScale(tonicLabel, preferFlats, isMajor) {
  const tonicPc = noteToPc(tonicLabel);
  const steps = isMajor ? MAJOR_STEPS : NAT_MINOR_STEPS;
  return steps.map(s => pcToNote(mod12(tonicPc + s), preferFlats));
}

/** Build the 7 diatonic triads for a key, each with numeral, chord name, and tone names. */
export function buildTriads(tonicLabel, preferFlats, isMajor) {
  const tonicPc = noteToPc(tonicLabel);
  const steps = isMajor ? MAJOR_STEPS : NAT_MINOR_STEPS;
  const roman = isMajor ? ROMAN_MAJOR : ROMAN_MINOR;
  const scale = steps.map(s => mod12(tonicPc + s));

  return scale.map((_, deg) => {
    const r = scale[deg];
    const t = scale[(deg + 2) % 7];
    const f = scale[(deg + 4) % 7];
    const q = chordQuality(mod12(t - r), mod12(f - r));
    const rootName = pcToNote(r, preferFlats);
    const tones = [rootName, pcToNote(t, preferFlats), pcToNote(f, preferFlats)];
    return { numeral: roman[deg], chord: formatChord(rootName, q), tones };
  });
}

/**
 * Map diatonic chord positions onto the circle of fifths for a given tonic index.
 * Returns { positions, chords } where chords carry ring ("major"/"minor"), numeral, and role.
 */
export function chainMapMajor(s) {
  return {
    positions: [mod12(s - 1), mod12(s), mod12(s + 1), mod12(s + 2), mod12(s + 3), mod12(s + 4), mod12(s + 5)],
    chords: [
      { idx: mod12(s - 1), ring: "major", numeral: "IV", role: "subdominant" },
      { idx: mod12(s), ring: "major", numeral: "I", role: "tonic" },
      { idx: mod12(s + 1), ring: "major", numeral: "V", role: "dominant" },
      { idx: mod12(s + 5), ring: "major", numeral: "vii°", role: "diatonic" },
      { idx: mod12(s - 1), ring: "minor", numeral: "ii", role: "diatonic" },
      { idx: mod12(s), ring: "minor", numeral: "vi", role: "diatonic" },
      { idx: mod12(s + 1), ring: "minor", numeral: "iii", role: "diatonic" },
    ],
  };
}

export function chainMapMinor(s) {
  return {
    positions: [mod12(s - 1), mod12(s), mod12(s + 1), mod12(s + 2), mod12(s + 3), mod12(s + 4), mod12(s + 5)],
    chords: [
      { idx: mod12(s - 1), ring: "minor", numeral: "iv", role: "subdominant" },
      { idx: mod12(s), ring: "minor", numeral: "i", role: "tonic" },
      { idx: mod12(s + 1), ring: "minor", numeral: "v", role: "dominant" },
      { idx: mod12(s + 2), ring: "minor", numeral: "ii°", role: "diatonic" },
      { idx: mod12(s - 1), ring: "major", numeral: "VI", role: "diatonic" },
      { idx: mod12(s), ring: "major", numeral: "III", role: "diatonic" },
      { idx: mod12(s + 1), ring: "major", numeral: "VII", role: "diatonic" },
    ],
  };
}

/** Convert a note name to a MIDI number (anchored around octave 3–4). */
export function noteNameToMidi(note) {
  return 48 + noteToPc(note);
}

/** Convert a MIDI number to frequency in Hz. */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Voice a chord so notes ascend without cramped intervals.
 * Keeps the root in the octave 48–60 range.
 */
export function voiceChordMidis(noteNames) {
  const baseMidis = noteNames.map(noteNameToMidi);
  const voiced = [baseMidis[0]];

  for (let i = 1; i < baseMidis.length; i++) {
    let m = baseMidis[i];
    while (m <= voiced[i - 1]) m += 12;
    while (m - voiced[i - 1] < 3) m += 12;
    voiced.push(m);
  }

  while (voiced[0] < 48) for (let i = 0; i < voiced.length; i++) voiced[i] += 12;
  while (voiced[0] > 60) for (let i = 0; i < voiced.length; i++) voiced[i] -= 12;

  return voiced;
}

/** Determine whether a key prefers flat spelling based on its accidental counts. */
export function prefersFlats(keyObj) {
  return (keyObj.flats > 0) || (keyObj.flats === keyObj.sharps && keyObj.flats > 0);
}

/** Map diatonic scale degrees to their circle-of-fifths positions (for progression arrows). */
export function degreeToCirclePos(chain, isMajor) {
  const roman = isMajor ? ROMAN_MAJOR : ROMAN_MINOR;
  const numeralToChord = new Map(chain.chords.map(c => [c.numeral, c]));
  return roman.map(num => {
    const e = numeralToChord.get(num);
    return e ? { idx: e.idx, ring: e.ring } : null;
  });
}
