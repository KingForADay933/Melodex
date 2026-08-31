import { useState } from 'react'

interface OnboardingScreenProps {
  onFinish: () => void
}

const SLIDES = [
  {
    title: 'Welcome to Melodex',
    body: 'Sketch chord progressions and melodies right in your browser — no account, nothing to install.',
  },
  {
    title: 'Pick a key, get chords instantly',
    body: 'Choose a key and scale, then tap a progression preset to fill your chord track — or build it chord by chord.',
  },
  {
    title: 'Sketch a melody, export MIDI',
    body: 'Draw a melody on the piano roll, hit play to hear it all together, then export a MIDI file to keep producing in any DAW.',
  },
]

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const [index, setIndex] = useState(0)
  const isLast = index === SLIDES.length - 1
  const slide = SLIDES[index]

  return (
    <div className="flex min-h-svh flex-col items-center justify-between bg-surface px-6 py-10 text-center">
      <button type="button" onClick={onFinish} className="self-end text-sm text-slate-400 hover:text-accent">
        Skip
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900">{slide.title}</h1>
        <p className="max-w-xs text-sm text-slate-500">{slide.body}</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <div className="flex justify-center gap-1.5">
          {SLIDES.map((s, i) => (
            <span key={s.title} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-accent' : 'bg-slate-200'}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {isLast ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  )
}
