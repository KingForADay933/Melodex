import { describe, expect, it } from 'vitest'
import { suggestNextDegrees } from './suggestions'

describe('suggestNextDegrees', () => {
  it('suggests the tonic as a top opening chord when the track is empty', () => {
    const suggestions = suggestNextDegrees(null)
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0]).toBe(1)
  })

  it('returns a non-empty result for a degree with only one observed continuation', () => {
    // Degree 2 (ii) resolves to 5 (V) in every preset that contains it.
    const suggestions = suggestNextDegrees(2)
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions).toContain(5)
  })

  it('falls back to opening-chord frequency for a degree that never starts a transition', () => {
    // Degree 7 (vii°) only ever appears as the last chord of a preset, so it
    // has no observed "next" data of its own.
    const suggestions = suggestNextDegrees(7)
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it('returns degrees within the diatonic range 1-7 with no duplicates', () => {
    for (let degree = 1; degree <= 7; degree += 1) {
      const suggestions = suggestNextDegrees(degree)
      expect(suggestions.every((d) => d >= 1 && d <= 7)).toBe(true)
      expect(new Set(suggestions).size).toBe(suggestions.length)
    }
  })

  it('respects the limit parameter', () => {
    expect(suggestNextDegrees(1, 1)).toHaveLength(1)
    expect(suggestNextDegrees(null, 2)).toHaveLength(2)
  })
})
