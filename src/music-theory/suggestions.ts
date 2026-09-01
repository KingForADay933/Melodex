import { COMMON_PROGRESSIONS } from './progressions'

/** Counts, for every scale degree, how often each other degree follows it
 * across all progression presets — built once since the presets are static. */
function buildTransitionCounts(): Map<number, Map<number, number>> {
  const counts = new Map<number, Map<number, number>>()
  for (const preset of COMMON_PROGRESSIONS) {
    for (let i = 0; i < preset.pattern.length - 1; i += 1) {
      const from = preset.pattern[i]
      const to = preset.pattern[i + 1]
      const toCounts = counts.get(from) ?? new Map<number, number>()
      toCounts.set(to, (toCounts.get(to) ?? 0) + 1)
      counts.set(from, toCounts)
    }
  }
  return counts
}

/** Counts how often each degree opens a progression — used both for "what's
 * a good first chord" and as a fallback for degrees that never appear as the
 * start of an observed transition (e.g. a leading-tone vii° chord, which
 * only ever shows up at the end of a preset's pattern). */
function buildFirstDegreeCounts(): Map<number, number> {
  const counts = new Map<number, number>()
  for (const preset of COMMON_PROGRESSIONS) {
    const first = preset.pattern[0]
    counts.set(first, (counts.get(first) ?? 0) + 1)
  }
  return counts
}

const TRANSITION_COUNTS = buildTransitionCounts()
const FIRST_DEGREE_COUNTS = buildFirstDegreeCounts()

function rankByCount(counts: Map<number, number>, limit: number): number[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([degree]) => degree)
}

/**
 * Suggests likely next scale degrees based on common progression patterns,
 * for the passive "suggest next chord" guidance hint.
 *
 * `lastDegree` is the chord track's current last degree, or `null` for an
 * empty track (in which case this suggests good starting chords instead).
 */
export function suggestNextDegrees(lastDegree: number | null, limit = 3): number[] {
  if (lastDegree === null) return rankByCount(FIRST_DEGREE_COUNTS, limit)

  const transitions = TRANSITION_COUNTS.get(lastDegree)
  if (!transitions || transitions.size === 0) return rankByCount(FIRST_DEGREE_COUNTS, limit)

  return rankByCount(transitions, limit)
}
