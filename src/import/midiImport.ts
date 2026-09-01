import { Midi } from '@tonejs/midi'
import type { Track } from '@tonejs/midi'
import { DEFAULT_BPM, MAX_BPM, MAX_IMPORT_BARS, MELODY_MAX_MIDI, MELODY_MIN_MIDI, MIN_BPM, STEPS_PER_BAR } from '../constants'
import { secondsPerStep } from '../export/midiExport'
import { getDiatonicChords, getScaleNotes } from '../music-theory'
import type { DiatonicChord, MusicKey, ScaleType } from '../music-theory'
import {
  DEFAULT_BASS_INSTRUMENT,
  DEFAULT_CHORD_INSTRUMENT,
  DEFAULT_HARMONY_INSTRUMENT,
  DEFAULT_MELODY_INSTRUMENT,
} from '../storage/projectStorage'
import type { ChordTrackItem, MelodyNote, Project } from '../types/project'
import { createChordTrackItem } from '../utils/createChordTrackItem'
import { createId } from '../utils/id'
import { wrapIntoRange } from '../utils/transpose'

export interface ImportResult {
  project: Project
  warnings: string[]
}

/** General MIDI's fixed percussion channel (10 in 1-indexed DAW UIs). */
const PERCUSSION_CHANNEL = 9

type NoteLayerKey = 'melody' | 'bassline' | 'harmonyMelody'

/** Every note name @tonejs/midi's `keySignatureKeys` table can produce,
 * mapped to its pitch class. */
const PITCH_CLASS_BY_NAME: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
}

/** Tracks worth analyzing: not the fixed percussion channel, and not empty.
 * Everything downstream (key detection, chord detection, layer assignment)
 * reads from this list rather than `midi.tracks` directly. */
function getUsableTracks(midi: Midi): Track[] {
  return midi.tracks.filter((track) => track.channel !== PERCUSSION_CHANNEL && track.notes.length > 0)
}

function detectTempo(midi: Midi, warnings: string[]): number {
  const rawBpm = midi.header.tempos[0]?.bpm
  const tempo = Number.isFinite(rawBpm) ? Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(rawBpm as number))) : DEFAULT_BPM
  if (midi.header.tempos.length > 1) {
    warnings.push('This file has tempo changes — Melodex uses a single tempo, so timing may drift later in the song.')
  }
  return tempo
}

/** Prefers the file's own key signature; falls back to scoring every
 * (tonic, scale) pair by how many notes fall in that scale, preferring
 * major and then the lowest tonic on a tie. */
function detectKey(midi: Midi, usableTracks: Track[]): MusicKey {
  const signature = midi.header.keySignatures[0]
  if (signature) {
    const tonic = PITCH_CLASS_BY_NAME[signature.key]
    if (tonic !== undefined && (signature.scale === 'major' || signature.scale === 'minor')) {
      return { tonic, scale: signature.scale }
    }
  }

  const pitchClasses = usableTracks.flatMap((track) => track.notes.map((note) => note.midi % 12))
  if (pitchClasses.length === 0) return { tonic: 0, scale: 'major' }

  let best: MusicKey = { tonic: 0, scale: 'major' }
  let bestScore = -1
  const scales: ScaleType[] = ['major', 'minor']
  for (const scale of scales) {
    for (let tonic = 0; tonic < 12; tonic += 1) {
      const scaleNotes = new Set(getScaleNotes(tonic, scale))
      const score = pitchClasses.filter((pc) => scaleNotes.has(pc)).length
      if (score > bestScore) {
        bestScore = score
        best = { tonic, scale }
      }
    }
  }
  return best
}

function pickBestDegree(pitchClasses: Set<number>, diatonicChords: DiatonicChord[]): number {
  let bestDegree = diatonicChords[0].degree
  let bestIntersection = -1
  let bestExtra = Infinity
  for (const chord of diatonicChords) {
    const chordTones = new Set(chord.notes)
    let intersection = 0
    for (const pc of chordTones) if (pitchClasses.has(pc)) intersection += 1
    let extra = 0
    for (const pc of pitchClasses) if (!chordTones.has(pc)) extra += 1

    if (intersection > bestIntersection || (intersection === bestIntersection && extra < bestExtra)) {
      bestIntersection = intersection
      bestExtra = extra
      bestDegree = chord.degree
    }
  }
  return bestDegree
}

/** One chord per bar, always — src/utils/sections.ts derives a section's
 * whole timeline length from `chords.length`, so there's no "rest" concept;
 * a silent bar reuses the previous bar's chord (or the tonic, if it's a
 * leading silence) rather than being skipped. */
function detectChords(usableTracks: Track[], key: MusicKey, cappedBars: number, stepSeconds: number): ChordTrackItem[] {
  const diatonicChords = getDiatonicChords(key.tonic, key.scale)
  const chords: ChordTrackItem[] = []
  let previousDegree: number | null = null

  for (let barIndex = 0; barIndex < cappedBars; barIndex += 1) {
    const barStart = barIndex * STEPS_PER_BAR
    const barEnd = barStart + STEPS_PER_BAR
    const pitchClasses = new Set<number>()

    for (const track of usableTracks) {
      for (const note of track.notes) {
        const noteStart = Math.round(note.time / stepSeconds)
        const noteEnd = noteStart + Math.max(1, Math.round(note.duration / stepSeconds))
        if (noteStart < barEnd && noteEnd > barStart) pitchClasses.add(note.midi % 12)
      }
    }

    const degree: number = pitchClasses.size > 0 ? pickBestDegree(pitchClasses, diatonicChords) : (previousDegree ?? 1)
    chords.push(createChordTrackItem(degree))
    previousDegree = degree
  }

  return chords
}

function averagePitch(track: Track): number {
  return track.notes.reduce((sum, note) => sum + note.midi, 0) / track.notes.length
}

/** Deterministic 3-pass claim: name hints first, then register (highest
 * average pitch -> melody, lowest -> bassline) for whatever's left, then
 * anything still unclaimed merges into melody so no note data is dropped.
 * Chord detection ignores this entirely — it always reads every usable
 * track's notes, since a generic MIDI file has no reliable "chords track". */
function classifyTracks(usableTracks: Track[]): Record<NoteLayerKey, Track[]> {
  const claimed = new Set<number>()
  const indices: Record<NoteLayerKey, number[]> = { melody: [], bassline: [], harmonyMelody: [] }

  const namePatterns: [NoteLayerKey, RegExp][] = [
    ['bassline', /bass/i],
    ['melody', /melody|lead|vocal/i],
    ['harmonyMelody', /harmony|counter/i],
  ]
  for (const [layer, pattern] of namePatterns) {
    const index = usableTracks.findIndex((track, i) => !claimed.has(i) && pattern.test(track.name))
    if (index !== -1) {
      indices[layer].push(index)
      claimed.add(index)
    }
  }

  const unclaimed = () => usableTracks.map((_, i) => i).filter((i) => !claimed.has(i))

  if (indices.melody.length === 0) {
    const candidates = unclaimed()
    if (candidates.length > 0) {
      const best = candidates.reduce((a, b) => (averagePitch(usableTracks[b]) > averagePitch(usableTracks[a]) ? b : a))
      indices.melody.push(best)
      claimed.add(best)
    }
  }
  if (indices.bassline.length === 0) {
    const candidates = unclaimed()
    if (candidates.length > 0) {
      const best = candidates.reduce((a, b) => (averagePitch(usableTracks[b]) < averagePitch(usableTracks[a]) ? b : a))
      indices.bassline.push(best)
      claimed.add(best)
    }
  }
  indices.melody.push(...unclaimed())

  return {
    melody: indices.melody.map((i) => usableTracks[i]),
    bassline: indices.bassline.map((i) => usableTracks[i]),
    harmonyMelody: indices.harmonyMelody.map((i) => usableTracks[i]),
  }
}

/** Same-pitch notes never overlap in a hand-drawn layer (PianoRoll's
 * clearOverlap enforces it) — imported data must satisfy the same
 * invariant, or a shadowed note becomes silently unreachable in the grid. */
function dedupeOverlaps(notes: MelodyNote[]): MelodyNote[] {
  const byPitch = new Map<number, MelodyNote[]>()
  for (const note of notes) {
    const list = byPitch.get(note.pitch) ?? []
    list.push(note)
    byPitch.set(note.pitch, list)
  }

  const kept: MelodyNote[] = []
  for (const list of byPitch.values()) {
    const sorted = [...list].sort((a, b) => a.startStep - b.startStep)
    let previousEnd = -Infinity
    for (const note of sorted) {
      if (note.startStep >= previousEnd) {
        kept.push(note)
        previousEnd = note.startStep + note.lengthSteps
      }
    }
  }
  return kept
}

function quantizeNotes(tracks: Track[], stepSeconds: number, cappedBars: number): MelodyNote[] {
  const capStep = cappedBars * STEPS_PER_BAR
  const notes: MelodyNote[] = []
  for (const track of tracks) {
    for (const note of track.notes) {
      const startStep = Math.round(note.time / stepSeconds)
      if (startStep >= capStep) continue
      const rawLength = Math.max(1, Math.round(note.duration / stepSeconds))
      const lengthSteps = Math.min(rawLength, capStep - startStep)
      const pitch = wrapIntoRange(note.midi, MELODY_MIN_MIDI, MELODY_MAX_MIDI)
      notes.push({ id: createId('note'), pitch, startStep, lengthSteps })
    }
  }
  return dedupeOverlaps(notes)
}

function deriveProjectName(sourceName: string): string {
  const stripped = sourceName.replace(/\.midi?$/i, '').trim()
  return stripped.length > 0 ? stripped : 'Imported MIDI'
}

/** Parses an already-loaded MIDI file into a brand-new Project: detected
 * key/tempo, one section, basic chord detection (notes per bar snapped to
 * the nearest diatonic triad), and melody/bass/harmony layers populated
 * from the source tracks. Pure and synchronous so it's independently
 * testable against a `Midi` built with @tonejs/midi's own builder API. */
export function buildProjectFromMidi(midi: Midi, sourceName: string): ImportResult {
  const warnings: string[] = []
  const usableTracks = getUsableTracks(midi)
  const tempo = detectTempo(midi, warnings)
  const key = detectKey(midi, usableTracks)
  const stepSeconds = secondsPerStep(tempo)

  const totalSteps = usableTracks.reduce((max, track) => {
    const trackMax = track.notes.reduce((m, note) => Math.max(m, Math.round((note.time + note.duration) / stepSeconds)), 0)
    return Math.max(max, trackMax)
  }, 0)
  const totalBars = Math.ceil(totalSteps / STEPS_PER_BAR)
  const cappedBars = Math.min(totalBars, MAX_IMPORT_BARS)
  if (cappedBars < totalBars) {
    warnings.push(`Song was ${totalBars} bars long; truncated to ${MAX_IMPORT_BARS} bars.`)
  }

  const chords = detectChords(usableTracks, key, cappedBars, stepSeconds)
  const layers = classifyTracks(usableTracks)
  const melody = quantizeNotes(layers.melody, stepSeconds, cappedBars)
  const bassline = quantizeNotes(layers.bassline, stepSeconds, cappedBars)
  const harmonyMelody = quantizeNotes(layers.harmonyMelody, stepSeconds, cappedBars)

  const now = Date.now()
  const project: Project = {
    id: createId('project'),
    name: deriveProjectName(sourceName),
    key,
    sections: [{ id: createId('section'), name: 'Section 1', chords, melody, bassline, harmonyMelody }],
    tempo,
    chordInstrument: DEFAULT_CHORD_INSTRUMENT,
    melodyInstrument: DEFAULT_MELODY_INSTRUMENT,
    bassInstrument: DEFAULT_BASS_INSTRUMENT,
    harmonyInstrument: DEFAULT_HARMONY_INSTRUMENT,
    createdAt: now,
    updatedAt: now,
  }

  return { project, warnings }
}

/** Reads a File picked by the user and parses it as MIDI. Parse failures
 * (not valid MIDI data) are left to throw — the caller (HomeScreen) turns
 * that into a user-facing error, matching how ExportScreen lets
 * downloadProjectZip's promise reject and just manages its loading flag. */
export async function importMidiFile(file: File): Promise<ImportResult> {
  const midi = new Midi(await file.arrayBuffer())
  return buildProjectFromMidi(midi, file.name)
}
