import { useGuidance } from '../../guidance/GuidanceContext'
import { LightbulbIcon } from './icons'

export function GuidanceToggleButton() {
  const { enabled, toggle } = useGuidance()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Turn off guidance hints' : 'Turn on guidance hints'}
      title={enabled ? 'Guidance hints: on' : 'Guidance hints: off'}
      className={`rounded-full p-2 transition-colors ${
        enabled ? 'bg-accent text-white' : 'border border-slate-200 bg-white text-slate-400 hover:bg-accent-soft'
      }`}
    >
      <LightbulbIcon className="h-4 w-4" />
    </button>
  )
}
