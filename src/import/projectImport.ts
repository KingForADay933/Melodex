import { normalizeProject } from '../storage/projectStorage'
import type { StoredProject } from '../storage/projectStorage'
import type { Project } from '../types/project'
import { createId } from '../utils/id'

/** Thrown when a file doesn't even loosely resemble a Melodex project, so
 * the caller can show one clear message instead of a raw parse exception. */
export class InvalidProjectFileError extends Error {
  constructor() {
    super('This doesn\'t look like a Melodex project file.')
    this.name = 'InvalidProjectFileError'
  }
}

/** Light shape guard before handing off to normalizeProject. normalizeProject
 * exists to tolerate *evolutionary* drift (an older Melodex version missing
 * newer fields, e.g. tempo/instruments/sections) — it assumes its input is
 * already close to correct and destructures straight into it, so it isn't
 * safe to call directly on arbitrary/adversarial JSON (a hand-edited or
 * truncated file, or one from a different app entirely), which is a real
 * possibility for a file a tester emails in rather than one our own code
 * wrote to localStorage. `name` and `key` are checked explicitly because,
 * unlike tempo/instruments/sections, normalizeProject has never had a
 * fallback for them — they've been required since the very first save
 * format, so a file missing either isn't "old", it's not a Melodex project. */
function assertPlausibleProject(raw: unknown): asserts raw is StoredProject {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new InvalidProjectFileError()
  const candidate = raw as Record<string, unknown>

  if (typeof candidate.name !== 'string') throw new InvalidProjectFileError()

  const key = candidate.key as Record<string, unknown> | undefined
  if (
    typeof key !== 'object' ||
    key === null ||
    typeof key.tonic !== 'number' ||
    (key.scale !== 'major' && key.scale !== 'minor')
  ) {
    throw new InvalidProjectFileError()
  }

  if (candidate.sections !== undefined && !Array.isArray(candidate.sections)) throw new InvalidProjectFileError()
  if (Array.isArray(candidate.sections)) {
    for (const section of candidate.sections) {
      if (typeof section !== 'object' || section === null || !Array.isArray((section as Record<string, unknown>).chords)) {
        throw new InvalidProjectFileError()
      }
    }
  }
}

/** Parses already-loaded JSON into a brand-new Project — fresh id/timestamps
 * (same pattern as cloneProject/createProject) so it can never collide with
 * an existing entry in this browser's own project store. Nested section/
 * chord/note ids are left as-is since nothing indexes by them globally. */
export function parseProjectJson(raw: unknown): Project {
  assertPlausibleProject(raw)
  const normalized = normalizeProject(raw)
  return { ...normalized, id: createId('project'), createdAt: Date.now(), updatedAt: Date.now() }
}

/** Reads a File picked by the user and parses it as a Melodex project. A
 * non-JSON file's SyntaxError is left to throw alongside InvalidProjectFileError
 * — the caller (HomeScreen) turns either into the same user-facing alert. */
export async function importProjectFile(file: File): Promise<Project> {
  return parseProjectJson(JSON.parse(await file.text()))
}
