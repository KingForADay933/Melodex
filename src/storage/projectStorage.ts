import { DEFAULT_BPM } from '../constants'
import type { ChordTrackItem, MelodyNote, Project, Section } from '../types/project'
import { createId } from '../utils/id'

const DEFAULT_CHORD_INSTRUMENT = 'warm'
const DEFAULT_MELODY_INSTRUMENT = 'pluck'
/** Distinct from melody's own default ('pluck') so a fresh project's lead
 * and harmony lines don't sound identical out of the box. */
const DEFAULT_HARMONY_INSTRUMENT = 'bright'
const DEFAULT_BASS_INSTRUMENT = 'warm'

const STORAGE_KEY = 'melodex.projects.v1'

/** A saved section may predate Phase 4 and lack the bassline/harmony
 * layers entirely. */
type StoredSection = Omit<Section, 'bassline' | 'harmonyMelody'> & Partial<Pick<Section, 'bassline' | 'harmonyMelody'>>

/** Raw JSON from localStorage may be current-shape, or saved by an earlier
 * version of the app — pre-Phase-3 projects have `chords`/`melody` at the
 * top level instead of `sections`, and pre-Phase-2 saves lack tempo/
 * instrument fields entirely. */
type StoredProject = Omit<Project, 'sections' | 'tempo' | 'chordInstrument' | 'melodyInstrument' | 'bassInstrument' | 'harmonyInstrument'> &
  Partial<Pick<Project, 'tempo' | 'chordInstrument' | 'melodyInstrument' | 'bassInstrument' | 'harmonyInstrument'>> & {
    sections?: StoredSection[]
    chords?: ChordTrackItem[]
    melody?: MelodyNote[]
  }

type ProjectStore = Record<string, StoredProject>

function normalizeChord(chord: ChordTrackItem): ChordTrackItem {
  return {
    ...chord,
    extension: chord.extension ?? 'triad',
    inversion: chord.inversion ?? 0,
  }
}

function normalizeSection(section: StoredSection): Section {
  return {
    ...section,
    chords: section.chords.map(normalizeChord),
    bassline: section.bassline ?? [],
    harmonyMelody: section.harmonyMelody ?? [],
  }
}

/** Fills in fields added by later phases (tempo, chord extension/inversion,
 * sections, bassline/harmony layers) for projects saved by an earlier
 * version of the app, so old localStorage data keeps working instead of
 * crashing on missing fields. A pre-Phase-3 project (flat `chords`/
 * `melody`, no `sections`) is wrapped into a single implicit "Section 1"
 * rather than migrated destructively. */
function normalizeProject(project: StoredProject): Project {
  const { chords: legacyChords, melody: legacyMelody, sections, ...rest } = project
  return {
    ...rest,
    sections: sections
      ? sections.map(normalizeSection)
      : [
          {
            id: createId('section'),
            name: 'Section 1',
            chords: (legacyChords ?? []).map(normalizeChord),
            melody: legacyMelody ?? [],
            bassline: [],
            harmonyMelody: [],
          },
        ],
    tempo: rest.tempo ?? DEFAULT_BPM,
    chordInstrument: rest.chordInstrument ?? DEFAULT_CHORD_INSTRUMENT,
    melodyInstrument: rest.melodyInstrument ?? DEFAULT_MELODY_INSTRUMENT,
    bassInstrument: rest.bassInstrument ?? DEFAULT_BASS_INSTRUMENT,
    harmonyInstrument: rest.harmonyInstrument ?? DEFAULT_HARMONY_INSTRUMENT,
  }
}

function readStore(): Record<string, Project> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ProjectStore
    return Object.fromEntries(Object.entries(parsed).map(([id, project]) => [id, normalizeProject(project)]))
  } catch {
    // Corrupted JSON or localStorage unavailable (private browsing, quota) —
    // treat it as an empty store rather than crashing the app.
    return {}
  }
}

function writeStore(store: Record<string, Project>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

/** All saved projects, most recently updated first. */
export function listProjects(): Project[] {
  return Object.values(readStore()).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function loadProject(id: string): Project | undefined {
  return readStore()[id]
}

/** Upserts a project by id. */
export function saveProject(project: Project): void {
  const store = readStore()
  store[project.id] = project
  writeStore(store)
}

export function deleteProject(id: string): void {
  const store = readStore()
  delete store[id]
  writeStore(store)
}

export function createProject(name = 'Untitled sketch'): Project {
  const now = Date.now()
  return {
    id: createId('project'),
    name,
    key: { tonic: 0, scale: 'major' },
    sections: [{ id: createId('section'), name: 'Section 1', chords: [], melody: [], bassline: [], harmonyMelody: [] }],
    tempo: DEFAULT_BPM,
    chordInstrument: DEFAULT_CHORD_INSTRUMENT,
    melodyInstrument: DEFAULT_MELODY_INSTRUMENT,
    bassInstrument: DEFAULT_BASS_INSTRUMENT,
    harmonyInstrument: DEFAULT_HARMONY_INSTRUMENT,
    createdAt: now,
    updatedAt: now,
  }
}
