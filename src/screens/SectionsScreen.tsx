import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ScreenHeader } from '../components/ScreenHeader'
import { BlueprintCard } from '../components/ui/BlueprintCard'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import { DuplicateIcon, PencilIcon, PlusIcon } from '../components/ui/icons'
import type { HistoryControls } from '../navigation/types'
import type { Project, Section } from '../types/project'
import { cloneSection } from '../utils/cloneProject'
import { createId } from '../utils/id'
import { formatKeyLabel } from '../utils/formatProject'

interface SectionsScreenProps extends HistoryControls {
  project: Project
  activeSectionId: string
  onSelectSection: (id: string) => void
  onSectionsChange: (sections: Section[]) => void
}

export function SectionsScreen({
  project,
  activeSectionId,
  onSelectSection,
  onSectionsChange,
  ...history
}: SectionsScreenProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const { sections } = project

  function addSection() {
    const fresh: Section = {
      id: createId('section'),
      name: `Section ${sections.length + 1}`,
      chords: [],
      melody: [],
      bassline: [],
      harmonyMelody: [],
    }
    onSectionsChange([...sections, fresh])
    onSelectSection(fresh.id)
  }

  function removeSection(id: string) {
    if (sections.length <= 1) return
    onSectionsChange(sections.filter((s) => s.id !== id))
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onSectionsChange(next)
  }

  function duplicateSection(id: string) {
    const index = sections.findIndex((s) => s.id === id)
    if (index === -1) return
    const clone = cloneSection(sections[index])
    onSectionsChange([...sections.slice(0, index + 1), clone, ...sections.slice(index + 1)])
    onSelectSection(clone.id)
  }

  function startRename(section: Section) {
    setNameDraft(section.name)
    setRenamingId(section.id)
  }

  function commitRename(id: string) {
    const trimmed = nameDraft.trim()
    if (trimmed.length > 0) {
      onSectionsChange(sections.map((s) => (s.id === id ? { ...s, name: trimmed } : s)))
    }
    setRenamingId(null)
  }

  function handleRenameKeyDown(id: string, event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation()
    if (event.key === 'Enter') commitRename(id)
    if (event.key === 'Escape') setRenamingId(null)
  }

  return (
    <div className="space-y-5">
      <ScreenHeader title="Sections" subtitle={formatKeyLabel(project)} {...history} />
      <GuidanceTip>
        A song is these sections chained together, in order — each has its own chord progression
        and melody. Tap a section to select it, then edit its chords or melody from those tabs.
      </GuidanceTip>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectSection(section.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectSection(section.id)
              }
            }}
            className="w-full cursor-pointer text-left"
          >
            <BlueprintCard active={section.id === activeSectionId} className="!py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {renamingId === section.id ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => commitRename(section.id)}
                      onKeyDown={(e) => handleRenameKeyDown(section.id, e)}
                      className="w-full rounded-md border border-accent px-1.5 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none"
                    />
                  ) : (
                    <div className="truncate font-semibold text-slate-800">{section.name}</div>
                  )}
                  <div className="text-xs text-slate-400">
                    {section.chords.length} {section.chords.length === 1 ? 'chord' : 'chords'} ·{' '}
                    {section.melody.length} {section.melody.length === 1 ? 'note' : 'notes'}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveSection(index, -1)
                    }}
                    disabled={index === 0}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-accent-soft hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Move section earlier"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveSection(index, 1)
                    }}
                    disabled={index === sections.length - 1}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-accent-soft hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Move section later"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      startRename(section)
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-accent-soft hover:text-accent"
                    aria-label={`Rename ${section.name}`}
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      duplicateSection(section.id)
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-accent-soft hover:text-accent"
                    aria-label={`Duplicate ${section.name}`}
                  >
                    <DuplicateIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSection(section.id)
                    }}
                    disabled={sections.length <= 1}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label={`Delete ${section.name}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            </BlueprintCard>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSection}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-500 hover:border-accent hover:text-accent"
      >
        <PlusIcon className="h-4 w-4" /> Add section
      </button>
    </div>
  )
}
