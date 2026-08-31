import type { ComponentType } from 'react'
import type { Screen } from '../navigation/types'
import { ChordsIcon, ExportIcon, HomeIcon, KeyIcon, MelodyIcon } from './ui/icons'

interface Tab {
  id: Screen
  label: string
  Icon: ComponentType<{ className?: string }>
}

const TABS: Tab[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'key', label: 'Key', Icon: KeyIcon },
  { id: 'chords', label: 'Chords', Icon: ChordsIcon },
  { id: 'melody', label: 'Melody', Icon: MelodyIcon },
  { id: 'export', label: 'Export', Icon: ExportIcon },
]

interface BottomTabBarProps {
  active: Screen
  onNavigate: (screen: Screen) => void
}

export function BottomTabBar({ active, onNavigate }: BottomTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 max-w-3xl">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-slate-400 hover:text-slate-500'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
