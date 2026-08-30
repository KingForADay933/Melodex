import { SHARP_NAMES } from '../music-theory'
import type { MusicKey, ScaleType } from '../music-theory'

interface KeyScalePickerProps {
  value: MusicKey
  onChange: (key: MusicKey) => void
}

const SCALES: ScaleType[] = ['major', 'minor']

export function KeyScalePicker({ value, onChange }: KeyScalePickerProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Key</h2>

      <div className="flex flex-wrap gap-2">
        {SHARP_NAMES.map((name, tonic) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange({ ...value, tonic })}
            className={`min-w-11 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              value.tonic === tonic
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {SCALES.map((scale) => (
          <button
            key={scale}
            type="button"
            onClick={() => onChange({ ...value, scale })}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              value.scale === scale ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {scale}
          </button>
        ))}
      </div>
    </section>
  )
}
