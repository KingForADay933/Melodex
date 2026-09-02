# Melodex

A mobile-first, browser-based app for sketching chord progressions and melodies. Pick a key, build a progression, sketch melody/harmony/bass lines on the piano roll, hit play, and export MIDI or audio — all client-side, no account or backend required. Projects autosave to `localStorage`.

## Features

**Songwriting**
- Key/scale picker (major and natural minor) with one-tap transpose of an existing song into a new key
- Progression presets, plus manual chord building from your key's diatonic degrees
- Chord extensions (triads, 7ths, 9ths, sus2/sus4) and inversions/slash chords
- Borrowed (modal-interchange) chords, secondary dominants, and context-aware substitution suggestions
- Multi-section song structure (verse/chorus/etc.) — reorder, duplicate, and edit chords/melody per section
- "Advanced mode" gates deeper theory tools (secondary dominants) out of the way until you want them

**Melody & piano roll**
- Draw, drag-to-move, and drag-to-resize notes, with adjustable zoom and snap-to-grid
- Three independent layers per section — lead melody, harmony line, and bassline — each with its own instrument
- Scale-lock highlighting shows which notes are in key; click a piano key to preview it
- Auto-fill: arpeggiate any section's chords into a melody/bassline with a contour pattern (up/down/up-down/random) and rhythm template (steady 8ths, straight 16ths, syncopated, long-short, sparse)

**Sound & playback**
- Four synthesized instrument presets (Warm, Pluck, Bright, Pad) via Tone.js
- Transport with play/stop, live playhead position, and fine/coarse tempo control (steppers or direct BPM entry)
- Undo/redo history and a keyboard shortcuts sheet (`?`), Space to play/stop, Ctrl/Cmd+Z / Shift+Z / Y for undo/redo

**Import & export**
- Import a `.mid` file into a new project, with basic chord detection
- Export a single MIDI file, a multi-track `.zip` (chords/melody/bass/harmony split into separate files), or a rendered `.wav` audio bounce (via `Tone.Offline`)
- Optional "humanize" pass adds subtle timing/velocity variation to MIDI exports

**Workflow**
- Multiple local projects — create, rename, duplicate, delete, reopen
- Replayable onboarding walkthrough and toggleable in-context guidance tips throughout

## Stack

- React + TypeScript, built with Vite
- [Tone.js](https://tonejs.github.io/) for synthesis and playback
- [`@tonejs/midi`](https://github.com/Tonejs/Midi) for MIDI import/export
- [JSZip](https://stuk.github.io/jszip/) for multi-track export
- Tailwind CSS for styling
- Vitest for unit tests

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run test     # run the test suite
npm run build    # typecheck + production build
```

## Project structure

```
src/
  music-theory/   # keys, scales, diatonic/extended chords, progressions — pure logic, no UI/audio deps
  melody/         # arpeggiator: auto-generates melody/bassline from a chord track
  audio/          # Tone.js instruments, playback engine, and a React hook wrapping it
  export/         # MIDI, multi-track zip, and WAV export
  import/         # MIDI file import and chord detection
  advancedMode/   # toggle gating advanced theory tools (secondary dominants, etc.)
  guidance/       # toggleable in-context hint system
  onboarding/     # first-run walkthrough
  storage/        # localStorage-backed project persistence, undo/redo history
  navigation/     # screen/tab types
  screens/        # one component per tab: Home, Key, Sections, Chords, Melody, Export
  components/     # chord track, piano roll, pickers, transport bar, shared UI
  types/          # shared app-level types (Project, Section, ChordTrackItem, MelodyNote)
```

The music-theory module is intentionally decoupled from React and Tone.js so it stays reusable and independently testable as new features get layered on.
