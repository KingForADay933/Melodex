import { useEffect, useRef, useState } from 'react'
import type { Project } from '../types/project'
import { PlaybackEngine } from './playback'

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

  useEffect(() => {
    const engine = new PlaybackEngine()
    engine.onStepChange = (step) => {
      setCurrentStep(step)
      if (step === null) setIsPlaying(false)
    }
    engineRef.current = engine

    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  const play = async (project: Project) => {
    if (!engineRef.current) return
    setIsPlaying(true)
    await engineRef.current.play(project)
  }

  const stop = () => {
    engineRef.current?.stop()
  }

  return { play, stop, isPlaying, currentStep }
}
