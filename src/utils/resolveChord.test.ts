import { describe, expect, it } from 'vitest'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem } from '../types/project'
import { resolveChord } from './resolveChord'

const cMajor: MusicKey = { tonic: 0, scale: 'major' }

function item(overrides: Partial<ChordTrackItem>): ChordTrackItem {
  return { id: 'c1', degree: 1, extension: 'triad', inversion: 0, ...overrides }
}

describe('resolveChord', () => {
  it('resolves a plain diatonic chord (no source) exactly as before', () => {
    const resolved = resolveChord(cMajor, item({ degree: 5 }))
    expect(resolved.symbol).toBe('G')
    expect(resolved.roman).toBe('V')
  })

  it('resolves a borrowed chord against the parallel scale', () => {
    // C major borrowing bVI from C minor: Ab major.
    const resolved = resolveChord(cMajor, item({ degree: 6, source: { kind: 'borrowed' } }))
    expect(resolved.rootName).toBe('Ab')
    expect(resolved.quality).toBe('major')
    expect(resolved.roman).toBe('♭VI')
  })

  it('resolves a secondary dominant tonicizing the target degree', () => {
    // V/vi in C major: E major (or E7), resolving to Am.
    const resolved = resolveChord(cMajor, item({ degree: 6, extension: 'seventh', source: { kind: 'secondaryDominant' } }))
    expect(resolved.rootName).toBe('E')
    expect(resolved.symbol).toBe('E7')
    expect(resolved.roman).toBe('V/vi')
  })

  it('re-resolves correctly after a key change, for all three source kinds — the whole point of storing degree/source instead of an absolute pitch', () => {
    const gMajor: MusicKey = { tonic: 7, scale: 'major' }
    const diatonic = item({ degree: 5 })
    const borrowed = item({ degree: 6, source: { kind: 'borrowed' } })
    const secondaryDominant = item({ degree: 6, extension: 'seventh', source: { kind: 'secondaryDominant' } })

    // Every chord's root should shift by +7 semitones (C -> G) when resolved
    // against the new key, with no changes to the ChordTrackItem itself.
    expect(resolveChord(gMajor, diatonic).root).toBe((resolveChord(cMajor, diatonic).root + 7) % 12)
    expect(resolveChord(gMajor, borrowed).root).toBe((resolveChord(cMajor, borrowed).root + 7) % 12)
    expect(resolveChord(gMajor, secondaryDominant).root).toBe((resolveChord(cMajor, secondaryDominant).root + 7) % 12)
  })
})
