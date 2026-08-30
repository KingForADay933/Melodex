import type { ReactNode } from 'react'

interface BlueprintCardProps {
  children: ReactNode
  className?: string
  /** Highlights the card's border, e.g. for the chord currently playing. */
  active?: boolean
}

function CornerTick({ className }: { className: string }) {
  return (
    <svg className={className} width="7" height="7" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <path d="M4 0V8M0 4H8" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/** Card with small corner tick marks, matching the "blueprint" card style
 * from the design mockups. Reused anywhere content sits in a bordered card. */
export function BlueprintCard({ children, className = '', active = false }: BlueprintCardProps) {
  return (
    <div
      className={`relative rounded-2xl border bg-white p-4 shadow-sm ${
        active ? 'border-accent' : 'border-slate-200'
      } ${className}`}
    >
      <CornerTick className="absolute -left-[3px] -top-[3px] text-slate-300" />
      <CornerTick className="absolute -right-[3px] -top-[3px] text-slate-300" />
      <CornerTick className="absolute -bottom-[3px] -left-[3px] text-slate-300" />
      <CornerTick className="absolute -bottom-[3px] -right-[3px] text-slate-300" />
      {children}
    </div>
  )
}
