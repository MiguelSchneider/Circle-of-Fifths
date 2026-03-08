# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive Circle of Fifths — a browser-based music theory tool. No build tools, no framework. Uses native ES modules and Tone.js for audio synthesis.

## Running

Serve via any local HTTP server (ES modules require it — `file://` won't work):
```
npx serve .
# or: python3 -m http.server
```
Then open `index.html`. The old `circleOfFiths.html` is the legacy single-file version.

## Architecture

```
index.html          ← HTML structure only, loads styles.css + js/app.js
styles.css          ← All CSS (dark theme, responsive layout, component styles)
js/
  constants.js      ← Static data: KEYS, scales, instruments, arpeggios, progressions, SVG layout
  music-theory.js   ← Pure functions: mod12, note/pitch-class conversion, scale/chord/triad builders,
                       circle-of-fifths mapping (chainMapMajor/Minor), voicing, MIDI conversion
  audio-engine.js   ← Tone.js synthesis engine (Salamander sampler, FM/additive/pluck synths)
  renderers.js      ← HTML-string renderers for piano keyboard widget, arpeggio dot grid, waveform preview
  circle-renderer.js← SVG builder for the circle diagram (nodes, arcs, progression arrows, drag helpers)
  progression.js    ← ProgressionBuilder class: chord sequence state, playback loop, preset/builder UI
  app.js            ← Entry point: app state (selectedIndex, selectedMode, rotation), event wiring,
                       main render() orchestrating all modules
```

### Module dependency graph

```
constants ← music-theory ← audio-engine
                          ← renderers ← circle-renderer
                                      ← progression (uses audio-engine + renderers)
                          ← app (imports everything, owns state + DOM events)
```

### Key design decisions

- **Pure data flow**: `music-theory.js` has zero DOM access — all functions are pure and testable
- **Single render loop**: `app.js` owns one `render()` function that rebuilds the SVG, info panel, chord table, and progression UI. The `ProgressionBuilder` class calls back into `render()` via `onRender`.
- **State**: Module-level variables in `app.js` (`selectedIndex`, `selectedMode`, `rotation`) — no state management library. `ProgressionBuilder` encapsulates its own state (progression array, playback, instrument/arpeggio selection).
- **Audio engine API**: Callers pass instrument/arpeggio indices rather than accessing globals. Tone.js instruments are lazy-initialized; `preload()` should be called on first user interaction to start loading Salamander piano samples.

## Key Conventions

- All music theory math uses mod-12 arithmetic (`mod12()` helper)
- Circle positions are indexed 0–11 in fifths order (C=0, G=1, D=2, ..., F=11)
- Enharmonic spelling (sharps vs flats) resolved by `pickSpelling()` + `prefersFlats()`
- SVG viewBox is 420×420; circle geometry uses `CENTER` (210), `RADIUS_OUTER` (150), `RADIUS_INNER` (102) from constants
- Audio engine uses Tone.js with six instruments: Sampler (grand piano, rock piano via Salamander samples), FMSynth (e-piano), Synth (organ, pad), PluckSynth pool (music box)
