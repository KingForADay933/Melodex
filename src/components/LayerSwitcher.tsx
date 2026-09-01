export type MelodyLayerId = 'lead' | 'harmony' | 'bass'

const LAYERS: { id: MelodyLayerId; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'harmony', label: 'Harmony' },
  { id: 'bass', label: 'Bass' },
]

interface LayerSwitcherProps {
  activeLayer: MelodyLayerId
  onSelect: (id: MelodyLayerId) => void
}

/** Pill row for switching between a section's three melodic layers (lead
 * melody, harmony/countermelody, bassline) — always shown, unlike
 * SectionSwitcher which hides when there's nothing to switch between. */
export function LayerSwitcher({ activeLayer, onSelect }: LayerSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {LAYERS.map((layer) => (
        <button
          key={layer.id}
          type="button"
          onClick={() => onSelect(layer.id)}
          aria-pressed={layer.id === activeLayer}
          className={`rounded-md border px-2.5 py-1 text-xs ${
            layer.id === activeLayer
              ? 'border-accent bg-accent text-white'
              : 'border-dashed border-slate-300 text-slate-500 hover:border-accent hover:text-accent'
          }`}
        >
          {layer.label}
        </button>
      ))}
    </div>
  )
}
