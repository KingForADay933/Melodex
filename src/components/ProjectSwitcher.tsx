import { useState } from 'react'
import type { Project } from '../types/project'
import { ChevronDownIcon } from './ui/icons'

interface ProjectSwitcherProps {
  projects: Project[]
  activeProject: Project
  onSwitch: (id: string) => void
  onNew: () => void
  onRename: (name: string) => void
  onDelete: (id: string) => void
}

function formatRelativeTime(timestamp: number): string {
  const diffMinutes = Math.round((Date.now() - timestamp) / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.round(diffHours / 24)}d ago`
}

export function ProjectSwitcher({ projects, activeProject, onSwitch, onNew, onRename, onDelete }: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(activeProject.name)

  function commitRename() {
    const trimmed = nameDraft.trim()
    onRename(trimmed.length > 0 ? trimmed : 'Untitled sketch')
    setIsEditingName(false)
  }

  function handleDelete(project: Project) {
    if (window.confirm(`Delete "${project.name}"? This can't be undone.`)) {
      onDelete(project.id)
    }
  }

  return (
    <div className="relative flex items-center gap-1">
      {isEditingName ? (
        <input
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') {
              setNameDraft(activeProject.name)
              setIsEditingName(false)
            }
          }}
          className="rounded-md border border-accent px-2 py-1 text-sm font-medium text-slate-800 focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setNameDraft(activeProject.name)
            setIsEditingName(true)
          }}
          className="max-w-40 truncate rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-accent-soft"
          title="Rename sketch"
        >
          {activeProject.name}
        </button>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="rounded-md p-1.5 text-slate-500 hover:bg-accent-soft"
        aria-label="Switch project"
        aria-expanded={isOpen}
      >
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          {/* Click-outside-to-close backdrop; no extra dependency needed for this. */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onNew()
                setIsOpen(false)
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-accent-soft"
            >
              + New sketch
            </button>
            <div className="my-1 border-t border-slate-100" />
            <div className="max-h-64 space-y-0.5 overflow-auto">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg px-1 py-0.5 ${
                    p.id === activeProject.id ? 'bg-accent-soft' : 'hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSwitch(p.id)
                      setIsOpen(false)
                    }}
                    className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left"
                  >
                    <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-400">Updated {formatRelativeTime(p.updatedAt)}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    aria-label={`Delete ${p.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
