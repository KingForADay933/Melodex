import { INSTRUMENT_IDS, INSTRUMENT_PRESETS } from '../audio/instruments'
import type { InstrumentId } from '../audio/instruments'

interface InstrumentPickerProps {
  label: string
  value: InstrumentId
  onChange: (id: InstrumentId) => void
}

export function InstrumentPicker({ label, value, onChange }: InstrumentPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-400">{label}:</span>
      {INSTRUMENT_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            value === id ? 'bg-accent text-white' : 'border border-slate-200 text-slate-600 hover:bg-accent-soft'
          }`}
        >
          {INSTRUMENT_PRESETS[id].label}
        </button>
      ))}
    </div>
  )
}
