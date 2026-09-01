import type { Section } from '../types/project'

interface SectionSwitcherProps {
  sections: Section[]
  activeSectionId: string
  onSelect: (id: string) => void
}

/** Quick pill-row jump between sections while editing Chords/Melody —
 * structural changes (add/rename/reorder/delete/duplicate) live only on
 * the dedicated Sections screen, not here. */
export function SectionSwitcher({ sections, activeSectionId, onSelect }: SectionSwitcherProps) {
  if (sections.length <= 1) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
          aria-pressed={section.id === activeSectionId}
          className={`rounded-md border px-2.5 py-1 text-xs ${
            section.id === activeSectionId
              ? 'border-accent bg-accent text-white'
              : 'border-dashed border-slate-300 text-slate-500 hover:border-accent hover:text-accent'
          }`}
        >
          {section.name}
        </button>
      ))}
    </div>
  )
}
