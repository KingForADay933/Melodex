import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import type { Project } from '../types/project'
import type { InstrumentId } from './instruments'
import { AudioUnlockError, PlaybackEngine } from './playback'
import type { PlaybackOptions } from './playback'

/** Whether the browser's AudioContext is unlocked yet. Starts 'locked' on
 * every load — iOS Safari (and other mobile browsers) refuse to produce
 * sound until a real user gesture resumes the context, so this tracks that
 * instead of just assuming it worked. 'failed' means a resume was attempted
 * and the context still isn't running, which the UI should surface instead
 * of just staying silent. */
export type AudioUnlockState = 'locked' | 'unlocking' | 'unlocked' | 'failed'

/** React lifecycle glue around PlaybackEngine: one engine per mounted app,
 * disposed on unmount, with playing/currentStep exposed as state for the UI.
 *
 * The engine is created inside the effect (not lazily via ref) so that
 * React StrictMode's dev-mode mount→cleanup→mount double-invoke leaves a
 * fresh, live engine behind rather than a disposed one from the first pass. */
export function useAudioEngine() {
  const engineRef = useRef<PlaybackEngine | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [unlockState, setUnlockState] = useState<AudioUnlockState>('locked')

  useEffect(() => {
    const engine = new PlaybackEngine()
    engine.onStepChange = (step) => {
      setCurrentStep(step)
      if (step === null) setIsPlaying(false)
    }
    engineRef.current = engine

    // Unlocks the AudioContext on the very first touch/click anywhere in the
    // app — not just a tap on Play or a piano-roll cell — so by the time a
    // tester actually presses Play, the context has already had a moment to
    // fully wake up instead of trying to resume *and* play the first sound
    // in the same gesture (where iOS is more likely to drop that first note).
    let primed = false
    const prime = () => {
      if (primed) return
      primed = true
      Tone.start().catch(() => {})
    }
    window.addEventListener('pointerdown', prime, { once: true, capture: true, passive: true })

    return () => {
      window.removeEventListener('pointerdown', prime, true)
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  const play = async (project: Project, options?: PlaybackOptions) => {
    if (!engineRef.current) return
    setUnlockState('unlocking')
    try {
      await engineRef.current.play(project, options)
      setUnlockState('unlocked')
      setIsPlaying(true)
    } catch (error) {
      if (error instanceof AudioUnlockError) {
        setUnlockState('failed')
        return
      }
      throw error
    }
  }

  const stop = () => {
    engineRef.current?.stop()
  }

  const previewNote = (pitch: number, instrumentId: InstrumentId) => {
    engineRef.current?.previewNote(pitch, instrumentId).then(
      () => setUnlockState('unlocked'),
      (error: unknown) => {
        if (error instanceof AudioUnlockError) setUnlockState('failed')
      },
    )
  }

  return { play, stop, previewNote, isPlaying, currentStep, unlockState }
}
