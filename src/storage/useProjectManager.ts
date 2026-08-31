import { useEffect, useState } from 'react'
import type { Project } from '../types/project'
import {
  createProject,
  deleteProject as deleteStoredProject,
  listProjects,
  loadProject,
  saveProject,
} from './projectStorage'

/**
 * Manages the active project plus the list of saved projects. Every edit is
 * autosaved to localStorage immediately — there's no explicit "Save" step,
 * matching the app's low-friction, no-account design.
 */
export function useProjectManager() {
  const [projects, setProjects] = useState<Project[]>(() => listProjects())
  const [activeProject, setActiveProject] = useState<Project>(() => listProjects()[0] ?? createProject())

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

  function updateActiveProject(updater: (project: Project) => Project): void {
    const next = { ...updater(activeProject), updatedAt: Date.now() }
    saveProject(next)
    setActiveProject(next)
    setProjects(listProjects())
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

  function renameActiveProject(name: string): void {
    updateActiveProject((p) => ({ ...p, name }))
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
    createNewProject,
    switchToProject,
    renameActiveProject,
    removeProject,
  }
}
