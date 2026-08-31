import { useEffect, useState } from 'react'
import type { Project } from '../types/project'
import {
  createProject,
  deleteProject as deleteStoredProject,
  listProjects,
  loadProject,
  saveProject,
} from './projectStorage'

interface History {
  past: Project[]
  future: Project[]
}

const EMPTY_HISTORY: History = { past: [], future: [] }
const MAX_HISTORY = 50

/**
 * Manages the active project plus the list of saved projects. Every edit is
 * autosaved to localStorage immediately — there's no explicit "Save" step,
 * matching the app's low-friction, no-account design. Also tracks per-project
 * undo/redo history for content edits (key/chords/melody/tempo) — renaming
 * and switching projects aren't part of that history, matching how most
 * creative apps keep undo scoped to the actual work.
 */
export function useProjectManager() {
  const [projects, setProjects] = useState<Project[]>(() => listProjects())
  const [activeProject, setActiveProject] = useState<Project>(() => listProjects()[0] ?? createProject())
  const [history, setHistory] = useState<History>(EMPTY_HISTORY)

  // First run in a browser with no saved projects yet: persist the fresh
  // project created above. Re-checks storage (rather than trusting a flag)
  // so React StrictMode's dev-mode effect double-invoke can't create
  // duplicate "Untitled sketch" projects.
  useEffect(() => {
    if (listProjects().length === 0) {
      saveProject(activeProject)
      setProjects([activeProject])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once, using the initial activeProject value
  }, [])

  // Undo/redo history is per-project — starting fresh on switch avoids
  // undoing into a different sketch's past state.
  useEffect(() => {
    setHistory(EMPTY_HISTORY)
  }, [activeProject.id])

  function persist(next: Project): void {
    saveProject(next)
    setActiveProject(next)
    setProjects(listProjects())
  }

  function updateActiveProject(updater: (project: Project) => Project): void {
    const next = { ...updater(activeProject), updatedAt: Date.now() }
    setHistory((h) => ({ past: [...h.past, activeProject].slice(-MAX_HISTORY), future: [] }))
    persist(next)
  }

  function undo(): void {
    if (history.past.length === 0) return
    const previous = history.past[history.past.length - 1]
    setHistory((h) => ({ past: h.past.slice(0, -1), future: [activeProject, ...h.future] }))
    persist({ ...previous, updatedAt: Date.now() })
  }

  function redo(): void {
    if (history.future.length === 0) return
    const next = history.future[0]
    setHistory((h) => ({ past: [...h.past, activeProject], future: h.future.slice(1) }))
    persist({ ...next, updatedAt: Date.now() })
  }

  function createNewProject(): void {
    const fresh = createProject()
    saveProject(fresh)
    setActiveProject(fresh)
    setProjects(listProjects())
  }

  function switchToProject(id: string): void {
    const target = loadProject(id)
    if (target) setActiveProject(target)
  }

  /** Renames any saved project by id, not just the active one — the Home
   * screen can rename a card without opening it first. */
  function renameProject(id: string, name: string): void {
    if (id === activeProject.id) {
      persist({ ...activeProject, name, updatedAt: Date.now() })
      return
    }
    const target = loadProject(id)
    if (!target) return
    saveProject({ ...target, name, updatedAt: Date.now() })
    setProjects(listProjects())
  }

  function removeProject(id: string): void {
    deleteStoredProject(id)
    const remaining = listProjects()
    setProjects(remaining)

    if (id !== activeProject.id) return

    if (remaining.length > 0) {
      setActiveProject(remaining[0])
    } else {
      const fresh = createProject()
      saveProject(fresh)
      setProjects([fresh])
      setActiveProject(fresh)
    }
  }

  return {
    projects,
    activeProject,
    updateActiveProject,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    createNewProject,
    switchToProject,
    renameProject,
    removeProject,
  }
}
