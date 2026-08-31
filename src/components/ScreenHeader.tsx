import { GuidanceToggleButton } from './ui/GuidanceToggleButton'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
      </div>
      <GuidanceToggleButton />
    </header>
  )
}
