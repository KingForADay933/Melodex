# Chord Sketch

A mobile-first, browser-based app for sketching chord progressions and melodies. Pick a key, tap a progression preset, sketch a melody on the piano roll, hit play, and export a MIDI file — all client-side, no account or backend required.

This is Phase 0 (pre-alpha skeleton) of the project. See the project brief for the full roadmap.

## Stack

- React + TypeScript, built with Vite
- [Tone.js](https://tonejs.github.io/) for audio playback
- [`@tonejs/midi`](https://github.com/Tonejs/Midi) for MIDI export
- Tailwind CSS for styling
- Vitest for unit tests

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run test     # run the music-theory test suite
npm run build    # typecheck + production build
```

## Project structure

```
src/
  music-theory/   # keys, scales, diatonic chords, progression presets — pure logic, no UI/audio deps
  audio/           # Tone.js playback engine + a React hook wrapping it
  export/          # MIDI file generation and download
  components/      # UI: key/scale picker, chord track, piano roll, transport controls
  types/           # shared app-level types (Project, ChordTrackItem, MelodyNote)
```

The music-theory module is intentionally decoupled from React and Tone.js so it stays reusable and independently testable as new features (manual voicings, more scales, multi-track export, etc.) get layered on in later phases.
