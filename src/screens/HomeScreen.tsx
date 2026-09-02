import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react'
import { ScreenHeader } from '../components/ScreenHeader'
import { BlueprintCard } from '../components/ui/BlueprintCard'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import { DuplicateIcon, PencilIcon, PlusIcon } from '../components/ui/icons'
import { importMidiFile } from '../import/midiImport'
import { importProjectFile } from '../import/projectImport'
import type { Project } from '../types/project'
import { formatKeyLabel, formatRelativeTime } from '../utils/formatProject'
import { getTotalChordCount } from '../utils/sections'

const DISCORD_INVITE_URL = 'https://discord.gg/C5mWRfJZh'

interface HomeScreenProps {
  projects: Project[]
  onOpen: (id: string) => void
  onNew: () => void
  onImportProject: (project: Project) => void
  onLoadExample: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onReplayOnboarding: () => void
  onShowShortcuts: () => void
}

export function HomeScreen({
  projects,
  onOpen,
  onNew,
  onImportProject,
  onLoadExample,
  onDelete,
  onRename,
  onDuplicate,
  onReplayOnboarding,
  onShowShortcuts,
}: HomeScreenProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [isImportingMidi, setIsImportingMidi] = useState(false)
  const [isImportingJson, setIsImportingJson] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  function handleDelete(project: Project, event: MouseEvent) {
    event.stopPropagation()
    if (window.confirm(`Delete "${project.name}"? This can't be undone.`)) {
      onDelete(project.id)
    }
  }

  function startRename(project: Project, event: MouseEvent) {
    event.stopPropagation()
    setNameDraft(project.name)
    setRenamingId(project.id)
  }

  function handleDuplicate(project: Project, event: MouseEvent) {
    event.stopPropagation()
    onDuplicate(project.id)
  }

  function commitRename(id: string) {
    const trimmed = nameDraft.trim()
    onRename(id, trimmed.length > 0 ? trimmed : 'Untitled sketch')
    setRenamingId(null)
  }

  function handleRenameKeyDown(id: string, event: KeyboardEvent<HTMLInputElement>) {
    // Stop Enter/Space from bubbling to the card's own keydown handler,
    // which would otherwise open the project right after renaming it.
    event.stopPropagation()
    if (event.key === 'Enter') commitRename(id)
    if (event.key === 'Escape') setRenamingId(null)
  }

  async function handleMidiFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same filename after a failed import
    if (!file) return

    setIsImportingMidi(true)
    try {
      const { project, warnings } = await importMidiFile(file)
      if (warnings.length > 0) window.alert(warnings.join('\n'))
      onImportProject(project)
    } catch {
      window.alert('Could not read this file as a MIDI file.')
    } finally {
      setIsImportingMidi(false)
    }
  }

  async function handleJsonFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same filename after a failed import
    if (!file) return

    setIsImportingJson(true)
    try {
      onImportProject(await importProjectFile(file))
    } catch {
      window.alert('Could not read this file as a Melodex project.')
    } finally {
      setIsImportingJson(false)
    }
  }

  return (
    <div className="space-y-5">
      <ScreenHeader title="Melodex" onShowShortcuts={onShowShortcuts} />

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

      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        onChange={handleMidiFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImportingMidi}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-accent-soft disabled:opacity-40"
      >
        {isImportingMidi ? 'Importing…' : 'Import MIDI'}
      </button>

      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        onChange={handleJsonFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => jsonInputRef.current?.click()}
        disabled={isImportingJson}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-accent-soft disabled:opacity-40"
      >
        {isImportingJson ? 'Importing…' : 'Import Project (.json)'}
      </button>

      <button
        type="button"
        onClick={onLoadExample}
        className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500 hover:border-accent hover:text-accent"
      >
        Load example song
      </button>

      {projects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent</h2>
          <div className="space-y-2">
            {projects.map((project) => (
              // A <button> can't contain nested <button>s (rename/delete),
              // so the card itself is a div acting as a button.
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
                    <div className="min-w-0 flex-1">
                      {renamingId === project.id ? (
                        <input
                          autoFocus
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => commitRename(project.id)}
                          onKeyDown={(e) => handleRenameKeyDown(project.id, e)}
                          className="w-full rounded-md border border-accent px-1.5 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none"
                        />
                      ) : (
                        <div className="truncate font-semibold text-slate-800">{project.name}</div>
                      )}
                      <div className="text-xs text-slate-400">
                        {formatKeyLabel(project)} · {project.sections.length}{' '}
                        {project.sections.length === 1 ? 'section' : 'sections'} ·{' '}
                        {getTotalChordCount(project.sections)} chords
                      </div>
                      <div className="text-xs text-slate-400">Updated {formatRelativeTime(project.updatedAt)}</div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => startRename(project, event)}
                        className="rounded p-2 text-slate-400 hover:bg-accent-soft hover:text-accent"
                        aria-label={`Rename ${project.name}`}
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleDuplicate(project, event)}
                        className="rounded p-2 text-slate-400 hover:bg-accent-soft hover:text-accent"
                        aria-label={`Duplicate ${project.name}`}
                      >
                        <DuplicateIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleDelete(project, event)}
                        className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        aria-label={`Delete ${project.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </BlueprintCard>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="space-y-2 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        <div>
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
            Got feedback? Join the Discord ↗
          </a>
        </div>
        <button type="button" onClick={onReplayOnboarding} className="hover:text-accent">
          Replay welcome tour
        </button>
      </footer>
    </div>
  )
}
