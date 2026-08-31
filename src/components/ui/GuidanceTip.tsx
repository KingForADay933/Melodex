import type { ReactNode } from 'react'
import { useGuidance } from '../../guidance/GuidanceContext'
import { LightbulbIcon } from './icons'

/** A short contextual hint, shown only while guidance is toggled on. */
export function GuidanceTip({ children }: { children: ReactNode }) {
  const { enabled } = useGuidance()
  if (!enabled) return null

  return (
    <div className="flex gap-2 rounded-xl bg-accent-soft px-3 py-2 text-sm text-slate-600">
      <LightbulbIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
      <p>{children}</p>
    </div>
  )
}
