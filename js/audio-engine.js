/**
 * Audio engine powered by Tone.js.
 * Uses Tone.Sampler with Salamander Grand Piano samples for realistic piano,
 * and Tone.js synths for other instruments.
 */

import * as Tone from "tone";
import { INSTRUMENTS, ARPEGGIO_PATTERNS } from "./constants.js";
import { voiceChordMidis } from "./music-theory.js";

// --- MIDI to Tone.js note name conversion ---

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

// --- Instrument instances (lazy-initialized) ---

let instruments = null;
let samplesLoaded = false;
let loadingPromise = null;

function ensureStarted() {
  if (Tone.getContext().state !== "running") {
    Tone.start();
  }
}

/** Salamander Grand Piano sample map — every 3rd note for good coverage. */
const SALAMANDER_URLS = {
  A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
  A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
  A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
  A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
  A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
  A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
  A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
  A7: "A7.mp3", C8: "C8.mp3",
};

const SALAMANDER_BASE_URL = "https://tonejs.github.io/audio/salamander/";

function createInstruments() {
  if (instruments) return loadingPromise;

  const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.15 }).toDestination();

  // Grand Piano — sampled Salamander
  const grandPiano = new Tone.Sampler({
    urls: SALAMANDER_URLS,
    baseUrl: SALAMANDER_BASE_URL,
    release: 1.2,
  }).connect(reverb);

  // Electric Piano — FM synthesis
  const electricPiano = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 3.01,
    modulationIndex: 14,
    oscillator: { type: "triangle" },
    envelope: { attack: 0.002, decay: 0.8, sustain: 0.1, release: 0.6 },
    modulation: { type: "square" },
    modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.4 },
    volume: -8,
  }).connect(reverb);

  // Rock Piano — sampled but brighter
  const rockPiano = new Tone.Sampler({
    urls: SALAMANDER_URLS,
    baseUrl: SALAMANDER_BASE_URL,
    release: 0.6,
  });
  const rockEQ = new Tone.EQ3({ high: 4, mid: 2, low: -2 }).connect(reverb);
  const rockDist = new Tone.Distortion({ distortion: 0.08, wet: 0.3 }).connect(rockEQ);
  rockPiano.connect(rockDist);

  // Organ — additive sine harmonics
  const organ = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine", partialCount: 6, partials: [1.0, 0.8, 0.5, 0.3, 0.15, 0.08] },
    envelope: { attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.08 },
    volume: -10,
  });
  const organChorus = new Tone.Chorus({ frequency: 2, delayTime: 3.5, depth: 0.4, wet: 0.3 })
    .connect(reverb);
  organChorus.start();
  organ.connect(organChorus);

  // Synth Pad — detuned sawtooth
  const synthPad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.15, decay: 0.3, sustain: 0.7, release: 0.5 },
    volume: -12,
  });
  const padFilter = new Tone.Filter({ frequency: 900, type: "lowpass", Q: 2 }).connect(reverb);
  const padChorus = new Tone.Chorus({ frequency: 0.8, delayTime: 4, depth: 0.6, wet: 0.5 })
    .connect(padFilter);
  padChorus.start();
  synthPad.connect(padChorus);

  // Music Box — pool of PluckSynths for polyphony (PluckSynth can't be used with PolySynth)
  const musicBoxPool = [];
  const MUSIC_BOX_POOL_SIZE = 8;
  for (let i = 0; i < MUSIC_BOX_POOL_SIZE; i++) {
    musicBoxPool.push(
      new Tone.PluckSynth({
        attackNoise: 4,
        dampening: 10000,
        resonance: 0.99,
        volume: -6,
      }).connect(reverb)
    );
  }
  let musicBoxNext = 0;
  const musicBox = {
    _pool: musicBoxPool,
    triggerAttackRelease(note, duration, time, velocity) {
      // Handle single note or array of notes
      const notes = Array.isArray(note) ? note : [note];
      for (const n of notes) {
        musicBoxPool[musicBoxNext].triggerAttackRelease(n, duration, time);
        musicBoxNext = (musicBoxNext + 1) % MUSIC_BOX_POOL_SIZE;
      }
    },
  };

  instruments = [grandPiano, electricPiano, rockPiano, organ, synthPad, musicBox];

  loadingPromise = Tone.loaded().then(() => {
    samplesLoaded = true;
  });

  return loadingPromise;
}

/** Export for UI to show loading state. */
export function isLoaded() {
  return samplesLoaded;
}

/** Preload samples. Call on first user interaction. */
export async function preload() {
  ensureStarted();
  await createInstruments();
}

// --- Note scheduling helpers ---

function getInstrument(instrumentIndex) {
  createInstruments();
  return instruments[instrumentIndex] || instruments[0];
}

function midiArrayToNoteNames(midis, instrumentIndex) {
  // Music box plays an octave up
  const shift = INSTRUMENTS[instrumentIndex]?.id === "music-box" ? 12 : 0;
  return midis.map(m => midiToNoteName(m + shift));
}

// --- Public API (same signatures as before) ---

/** Play a chord as a block (all notes simultaneously). */
export function playChord(noteNames, instrumentIndex, durationSec = 1.2) {
  ensureStarted();
  const inst = getInstrument(instrumentIndex);
  const midis = voiceChordMidis(noteNames);
  const toneNotes = midiArrayToNoteNames(midis, instrumentIndex);
  const now = Tone.now();

  if (inst instanceof Tone.Sampler) {
    // Sampler: trigger each note individually for proper polyphony
    for (const note of toneNotes) {
      inst.triggerAttackRelease(note, durationSec, now, 0.7);
    }
  } else {
    inst.triggerAttackRelease(toneNotes, durationSec, now, 0.7);
  }
}

/** Play a chord as an arpeggiated pattern. */
export function playArpeggio(noteNames, patternIndex, instrumentIndex, sustainPedal, totalDurSec) {
  ensureStarted();
  const inst = getInstrument(instrumentIndex);
  const midis = voiceChordMidis(noteNames);
  const toneNotes = midiArrayToNoteNames(midis, instrumentIndex);
  const pattern = ARPEGGIO_PATTERNS[patternIndex].steps;
  const stepDur = totalDurSec / pattern.length;
  const now = Tone.now();

  for (let s = 0; s < pattern.length; s++) {
    const t0 = now + s * stepDur;
    // Sustain: notes ring until the end of this chord's beat (not beyond)
    const noteDur = sustainPedal
      ? (totalDurSec - s * stepDur)
      : Math.min(stepDur * 1.5, totalDurSec * 0.85);

    const stepNotes = pattern[s].map(idx => toneNotes[idx]);

    if (inst instanceof Tone.Sampler) {
      for (const note of stepNotes) {
        inst.triggerAttackRelease(note, noteDur, t0, 0.7);
      }
    } else {
      inst.triggerAttackRelease(stepNotes, noteDur, t0, 0.7);
    }
  }
}

/**
 * Play a chord using the current arpeggio pattern.
 * If the pattern is a single block chord, plays as a chord; otherwise arpeggiated.
 */
export function playWithPattern(noteNames, arpeggioIndex, instrumentIndex, sustainPedal, beatDurSec) {
  const pattern = ARPEGGIO_PATTERNS[arpeggioIndex];
  if (pattern.steps.length === 1) {
    playChord(noteNames, instrumentIndex, beatDurSec);
  } else {
    playArpeggio(noteNames, arpeggioIndex, instrumentIndex, sustainPedal, beatDurSec * 0.95);
  }
}
