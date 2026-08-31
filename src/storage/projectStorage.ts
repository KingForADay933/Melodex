import type { Project } from '../types/project'
import { createId } from '../utils/id'

const STORAGE_KEY = 'melodex.projects.v1'

type ProjectStore = Record<string, Project>

function readStore(): ProjectStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProjectStore) : {}
  } catch {
    // Corrupted JSON or localStorage unavailable (private browsing, quota) —
    // treat it as an empty store rather than crashing the app.
    return {}
  }
}

function writeStore(store: ProjectStore): void {
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
    chords: [],
    melody: [],
    createdAt: now,
    updatedAt: now,
  }
}
