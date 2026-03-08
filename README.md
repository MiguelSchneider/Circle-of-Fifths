# Interactive Circle of Fifths

A browser-based music theory tool that visualizes the Circle of Fifths and lets you explore keys, scales, chords, and progressions — with real-time audio playback.

Built with vanilla JavaScript (ES modules) and [Tone.js](https://tonejs.github.io/) for synthesis. No build step, no framework.

## Features

### Circle of Fifths Visualization
- Interactive SVG diagram with all 12 major and relative minor keys
- Color-coded harmonic relationships: **tonic**, **dominant**, **subdominant**, diatonic, and non-diatonic tones
- Click outer ring for major keys, inner ring for relative minors
- Drag to rotate the circle freely

### Key & Scale Information
- Displays the selected key's scale degrees, sharps/flats count, and relative major/minor
- Diatonic triad table with Roman numeral analysis (I, ii, iii, IV, V, vi, vii°)
- Visual piano keyboard highlighting scale tones

### Chord Playback
- Click any diatonic chord to hear it played
- Six synthesized instruments:
  - **Grand Piano** — Karplus-Strong physical modeling
  - **Electric Piano** — FM/additive synthesis
  - **Rock Piano** — Karplus-Strong with brighter attack
  - **Organ** — Additive synthesis with drawbar-style harmonics
  - **Synth Pad** — Detuned sawtooth with filter sweep
  - **Music Box** — Karplus-Strong with high damping
- Sustain toggle for held vs. staccato voicings

### Arpeggio Styles
- **Block** — all chord tones at once
- **Alberti Bass** — classical broken chord pattern
- **Waltz** — root then upper voices
- **Pop Ballad** — root, third, fifth, third
- **Ascending** / **Descending** — sequential arpeggiation

### Progression Builder
- Preset progressions for both major and minor keys:
  - Major: Pop (I–V–vi–IV), Classic (I–IV–V–I), 50s, Jazz (ii–V–I), Canon, Sad
  - Minor: Andalusian (i–VII–VI–v), Minor Pop, Classic, Epic
- Build custom progressions by clicking chords
- Adjustable BPM (60–180) with play/stop controls
- Visual progression arrows overlaid on the circle diagram

## Getting Started

### Prerequisites

A local HTTP server is required — ES modules don't work over `file://` URLs.

### Run

```bash
# Option 1: Node.js
npx serve .

# Option 2: Python
python3 -m http.server
```

Then open [http://localhost:3000](http://localhost:3000) (or the port shown by your server).

### Usage

1. **Select a key** — click any node on the circle (outer = major, inner = minor)
2. **Explore the scale** — the info panel shows scale notes, the piano highlights them
3. **Play chords** — expand "Chords in key" and click the play button on any triad
4. **Try progressions** — pick a preset or build your own, then hit Play
5. **Change the sound** — switch instruments and arpeggio styles at the bottom of the panel

> Audio loads on first interaction (Tone.js requires a user gesture to start the AudioContext).

## Project Structure

```
index.html              HTML shell — loads styles.css + js/app.js
styles.css              Dark theme, responsive grid layout, component styles

js/
  constants.js          Keys, scales, instruments, arpeggios, progressions, SVG geometry
  music-theory.js       Pure functions: mod-12 math, scale/chord/triad builders, voicing
  audio-engine.js       Tone.js synthesis: Karplus-Strong, additive, FM synths
  renderers.js          HTML renderers for piano keyboard, arpeggio grid, waveform preview
  circle-renderer.js    SVG builder for circle diagram, arcs, progression arrows
  progression.js        ProgressionBuilder class: sequence state, playback loop, UI
  app.js                Entry point: state management, event wiring, main render loop
```

### Architecture

All music theory logic lives in `music-theory.js` as pure, testable functions with zero DOM access. The app uses a single `render()` function in `app.js` that rebuilds the UI from state — no virtual DOM, no reactive framework, just straightforward imperative rendering.

State is minimal: the selected key index (0–11 in fifths order), mode (major/minor), and circle rotation angle. The `ProgressionBuilder` class encapsulates its own playback state.

### Module Dependency Graph

```
constants ← music-theory ← audio-engine
                          ← renderers ← circle-renderer
                                      ← progression
                          ← app (imports all, owns state + DOM)
```

## Tech Stack

- **Vanilla JS** with native ES modules (`import`/`export`)
- **[Tone.js](https://tonejs.github.io/)** v15 for Web Audio synthesis (loaded via [esm.sh](https://esm.sh) import map)
- **SVG** for the circle diagram (programmatically generated)
- **CSS Custom Properties** for theming and color-coding

## Music Theory Reference

The Circle of Fifths arranges all 12 keys by ascending perfect fifths (C → G → D → A → ...). Each key's nearest neighbors are its **dominant** (clockwise) and **subdominant** (counter-clockwise). The inner ring shows **relative minor** keys, which share the same key signature as their outer major counterpart.

## License

This project is open source.
