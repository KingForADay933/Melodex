const STORAGE_KEY = 'melodex.onboarding-seen'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return true // fail open — don't block the app if storage is unavailable
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // localStorage unavailable — onboarding will just show again next visit.
  }
}
