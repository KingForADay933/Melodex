import type { MouseEvent } from 'react'
import { ScreenHeader } from '../components/ScreenHeader'
import { BlueprintCard } from '../components/ui/BlueprintCard'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import { PlusIcon } from '../components/ui/icons'
import type { Project } from '../types/project'
import { formatKeyLabel } from '../utils/formatProject'

const DISCORD_INVITE_URL = 'https://discord.gg/C5mWRfJZh'

interface HomeScreenProps {
  projects: Project[]
  onOpen: (id: string) => void
  onNew: () => void
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

export function HomeScreen({ projects, onOpen, onNew, onDelete }: HomeScreenProps) {
  function handleDelete(project: Project, event: MouseEvent) {
    event.stopPropagation()
    if (window.confirm(`Delete "${project.name}"? This can't be undone.`)) {
      onDelete(project.id)
    }
  }

  return (
    <div className="space-y-5">
      <ScreenHeader title="Melodex" />

      <GuidanceTip>
        Guidance is on — hints like this explain each step. Turn them off anytime with the icon
        above.
      </GuidanceTip>

      <button
        type="button"
        onClick={onNew}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        <PlusIcon className="h-4 w-4" /> New sketch
      </button>

      {projects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent</h2>
          <div className="space-y-2">
            {projects.map((project) => (
              // A <button> can't contain a nested <button> (the delete
              // control), so the card itself is a div acting as a button.
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(project.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onOpen(project.id)
                  }
                }}
                className="w-full cursor-pointer text-left"
              >
                <BlueprintCard className="hover:border-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800">{project.name}</div>
                      <div className="text-xs text-slate-400">
                        {formatKeyLabel(project)} · {project.chords.length}{' '}
                        {project.chords.length === 1 ? 'chord' : 'chords'}
                      </div>
                      <div className="text-xs text-slate-400">Updated {formatRelativeTime(project.updatedAt)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => handleDelete(project, event)}
                      className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={`Delete ${project.name}`}
                    >
                      ×
                    </button>
                  </div>
                </BlueprintCard>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
          Got feedback? Join the Discord ↗
        </a>
      </footer>
    </div>
  )
}
