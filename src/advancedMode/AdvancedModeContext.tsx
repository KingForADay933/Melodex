import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const STORAGE_KEY = 'melodex.advanced-mode'

function readStoredPreference(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // Advanced mode (secondary dominants) is opt-in — off until a user
    // deliberately turns it on, unlike guidance which defaults on.
    return raw === null ? false : raw === 'true'
  } catch {
    return false
  }
}

interface AdvancedModeContextValue {
  enabled: boolean
  toggle: () => void
}

const AdvancedModeContext = createContext<AdvancedModeContextValue | null>(null)

export function AdvancedModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(readStoredPreference)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
    } catch {
      // localStorage unavailable — the preference just won't persist.
    }
  }, [enabled])

  return (
    <AdvancedModeContext.Provider value={{ enabled, toggle: () => setEnabled((v) => !v) }}>
      {children}
    </AdvancedModeContext.Provider>
  )
}

/** Whether advanced harmony features (currently: secondary dominants) are
 * shown, and a way to toggle that — a global, persisted preference, though
 * the toggle control itself only appears where it's relevant (Chords screen). */
export function useAdvancedMode(): AdvancedModeContextValue {
  const ctx = useContext(AdvancedModeContext)
  if (!ctx) throw new Error('useAdvancedMode must be used within an AdvancedModeProvider')
  return ctx
}
