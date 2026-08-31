import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const STORAGE_KEY = 'melodex.guidance-enabled'

function readStoredPreference(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // Guidance defaults to on for first-time (beginner) users.
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

interface GuidanceContextValue {
  enabled: boolean
  toggle: () => void
}

const GuidanceContext = createContext<GuidanceContextValue | null>(null)

export function GuidanceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(readStoredPreference)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
    } catch {
      // localStorage unavailable — the preference just won't persist.
    }
  }, [enabled])

  return (
    <GuidanceContext.Provider value={{ enabled, toggle: () => setEnabled((v) => !v) }}>
      {children}
    </GuidanceContext.Provider>
  )
}

/** Whether passive theory-guidance hints are on, and a way to toggle them. */
export function useGuidance(): GuidanceContextValue {
  const ctx = useContext(GuidanceContext)
  if (!ctx) throw new Error('useGuidance must be used within a GuidanceProvider')
  return ctx
}
