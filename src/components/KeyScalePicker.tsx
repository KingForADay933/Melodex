import { SHARP_NAMES } from '../music-theory'
import type { MusicKey, ScaleType } from '../music-theory'

interface KeyScalePickerProps {
  value: MusicKey
  onChange: (key: MusicKey) => void
}

const SCALES: ScaleType[] = ['major', 'minor']

export function KeyScalePicker({ value, onChange }: KeyScalePickerProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Root note</h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {SHARP_NAMES.map((name, tonic) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange({ ...value, tonic })}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                value.tonic === tonic
                  ? 'bg-accent text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-accent-soft'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scale</h2>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {SCALES.map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => onChange({ ...value, scale })}
              className={`rounded-lg px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
                value.scale === scale ? 'bg-accent text-white' : 'text-slate-600 hover:bg-accent-soft'
              }`}
            >
              {scale}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
