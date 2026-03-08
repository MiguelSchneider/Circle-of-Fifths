/**
 * Static data for the Circle of Fifths application.
 * All musical constants, instrument definitions, arpeggio patterns, and preset progressions.
 */

// 12 keys in circle-of-fifths order: each has a major key, sharp/flat count, and relative minor
export const KEYS = [
  { major: "C", sharps: 0, flats: 0, minor: "Am" },
  { major: "G", sharps: 1, flats: 0, minor: "Em" },
  { major: "D", sharps: 2, flats: 0, minor: "Bm" },
  { major: "A", sharps: 3, flats: 0, minor: "F#m" },
  { major: "E", sharps: 4, flats: 0, minor: "C#m" },
  { major: "B", sharps: 5, flats: 0, minor: "G#m" },
  { major: "F# / Gb", sharps: 6, flats: 6, minor: "D#m / Ebm" },
  { major: "Db / C#", sharps: 7, flats: 5, minor: "Bbm / A#m" },
  { major: "Ab", sharps: 0, flats: 4, minor: "Fm" },
  { major: "Eb", sharps: 0, flats: 3, minor: "Cm" },
  { major: "Bb", sharps: 0, flats: 2, minor: "Gm" },
  { major: "F", sharps: 0, flats: 1, minor: "Dm" },
];

export const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Scale intervals (semitones from tonic)
export const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
export const NAT_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

// Roman numeral labels for diatonic triads
export const ROMAN_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
export const ROMAN_MINOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"];

// Piano keyboard layout (pitch classes for white/black keys)
export const PIANO_WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
export const PIANO_BLACK_PCS = [1, 3, 6, 8, 10];        // C# D# F# G# A#
export const PIANO_BLACK_POS = [1, 2, 4, 5, 6];          // white-key boundary index

// Preset chord progressions
export const PROGRESSIONS_MAJOR = [
  { name: "Pop", numerals: "I – V – vi – IV", degrees: [0, 4, 5, 3] },
  { name: "Classic", numerals: "I – IV – V – I", degrees: [0, 3, 4, 0] },
  { name: "50s", numerals: "I – vi – IV – V", degrees: [0, 5, 3, 4] },
  { name: "Jazz", numerals: "ii – V – I", degrees: [1, 4, 0] },
  { name: "Canon", numerals: "I – V – vi – iii – IV – I – IV – V", degrees: [0, 4, 5, 2, 3, 0, 3, 4] },
  { name: "Sad", numerals: "vi – IV – I – V", degrees: [5, 3, 0, 4] },
];

export const PROGRESSIONS_MINOR = [
  { name: "Andalusian", numerals: "i – VII – VI – v", degrees: [0, 6, 5, 4] },
  { name: "Minor pop", numerals: "i – VI – III – VII", degrees: [0, 5, 2, 6] },
  { name: "Classic", numerals: "i – iv – v – i", degrees: [0, 3, 4, 0] },
  { name: "Epic", numerals: "i – VI – III – VII", degrees: [0, 5, 2, 6] },
];

// Arpeggio playback patterns — each step is an array of chord-tone indices (0=root, 1=third, 2=fifth)
export const ARPEGGIO_PATTERNS = [
  { id: "block", name: "Block", steps: [[0, 1, 2]] },
  { id: "alberti", name: "Alberti Bass", steps: [[0], [2], [1], [2]] },
  { id: "waltz", name: "Waltz", steps: [[0], [1, 2], [1, 2]] },
  { id: "pop", name: "Pop Ballad", steps: [[0], [1], [2], [1]] },
  { id: "ascending", name: "Ascending", steps: [[0], [1], [2]] },
  { id: "descending", name: "Descending", steps: [[2], [1], [0]] },
  { id: "miguel", name: "Miguel", steps: [[0, 2], [1], [0]] },
];

// Instrument definitions for the audio engine
// Each instrument uses either additive oscillator synthesis (voices[]) or Karplus-Strong (synthesis: "ks")
export const INSTRUMENTS = [
  {
    id: "grand-piano", name: "Grand Piano",
    synthesis: "ks",
    ksStrings: 3, ksDetune: 0.4,
    ksDamping: 0.998, ksHardness: 0.55, ksGain: 0.5,
    ksBodyCutoff: 4500, ksBodyQ: 0.5,
    noiseAmt: 0.08, noiseDur: 0.03, noiseFiltMult: 4, noiseQ: 0.8,
  },
  {
    id: "electric-piano", name: "Electric Piano",
    voices: [
      { type: "sine", harmonic: 1, amp: 1.0, decayMult: 1.0 },
      { type: "sine", harmonic: 2, amp: 0.55, decayMult: 0.8 },
      { type: "sine", harmonic: 3, amp: 0.2, decayMult: 0.5 },
      { type: "sine", harmonic: 4, amp: 0.4, decayMult: 0.6 },
      { type: "sine", harmonic: 7, amp: 0.2, decayMult: 0.3 },
    ],
    attack: 0.003, decay: 0.9, sustain: 0.1, release: 0.5,
    filterFreq: 2200, filterAttackFreq: 4500, filterDecay: 0.3, filterQ: 1.2,
    detune: 2,
    noiseAmt: 0.06, noiseDur: 0.025, noiseFiltMult: 5, noiseQ: 1.5,
  },
  {
    id: "rock-piano", name: "Rock Piano",
    synthesis: "ks",
    ksStrings: 2, ksDetune: 0.3,
    ksDamping: 0.995, ksHardness: 0.8, ksGain: 0.55,
    ksBodyCutoff: 6000, ksBodyQ: 0.4,
    noiseAmt: 0.12, noiseDur: 0.025, noiseFiltMult: 3, noiseQ: 0.6,
  },
  {
    id: "organ", name: "Organ",
    voices: [
      { type: "sine", harmonic: 0.5, amp: 0.6 },
      { type: "sine", harmonic: 1, amp: 1.0 },
      { type: "sine", harmonic: 2, amp: 0.8 },
      { type: "sine", harmonic: 3, amp: 0.5 },
      { type: "sine", harmonic: 4, amp: 0.3 },
      { type: "sine", harmonic: 6, amp: 0.15 },
    ],
    attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.08,
    filterFreq: 4000, filterQ: 0.5, detune: 6,
    noiseAmt: 0.03, noiseDur: 0.015, noiseFiltMult: 2, noiseQ: 0.5,
  },
  {
    id: "synth-pad", name: "Synth Pad",
    voices: [
      { type: "sawtooth", harmonic: 1, amp: 0.6 },
      { type: "sawtooth", harmonic: 1.002, amp: 0.6 },
      { type: "triangle", harmonic: 0.5, amp: 0.3 },
    ],
    attack: 0.15, decay: 0.2, sustain: 0.7, release: 0.5,
    filterFreq: 900, filterAttackFreq: 1400, filterDecay: 0.5, filterQ: 2,
    detune: 8,
  },
  {
    id: "music-box", name: "Music Box",
    synthesis: "ks",
    ksStrings: 1, ksDetune: 0,
    ksDamping: 0.999, ksHardness: 0.9, ksGain: 0.35,
    ksBodyCutoff: 10000, ksBodyQ: 0.3,
    octaveShift: 1,
    noiseAmt: 0.03, noiseDur: 0.01, noiseFiltMult: 6, noiseQ: 2,
  },
];

// SVG layout constants
export const SVG_SIZE = 420;
export const CENTER = SVG_SIZE / 2; // 210
export const RADIUS_OUTER = 150;
export const RADIUS_INNER = 102;
