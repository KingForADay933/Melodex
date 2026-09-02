import { useEffect, useRef } from 'react'

/** Keeps the screen awake while `active` (playback) is true, so mobile
 * auto-lock can't throttle Web Audio or cut off a loop mid-take. No-ops
 * silently where the API isn't supported (older browsers, some desktop
 * Safari versions) rather than ever surfacing an error to the user. */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let cancelled = false
    async function acquire() {
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          sentinel.release().catch(() => {})
          return
        }
        sentinelRef.current = sentinel
      } catch {
        // Low battery, permission policy, etc. — never breaks playback.
      }
    }
    acquire()

    // The browser releases the lock automatically when the tab is
    // backgrounded and does not restore it on its own when the tab comes
    // back to the foreground — re-acquiring here is required, not optional.
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
    }
  }, [active])
}
