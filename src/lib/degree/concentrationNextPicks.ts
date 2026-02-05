import { normalizeCourseCode } from '../courses/courseCode'

type NextPickInput = {
  eligibleCourses: string[]
  need400: boolean
  unlockCounts: Map<string, number>
  is400Level: (courseCode: string) => boolean
}

export function rankConcentrationNextPicks({
  eligibleCourses,
  need400,
  unlockCounts,
  is400Level,
}: NextPickInput) {
  const normalized = eligibleCourses.map(normalizeCourseCode)
  const unique = Array.from(new Set(normalized))

  return unique.sort((a, b) => {
    if (need400) {
      const a400 = is400Level(a) ? 1 : 0
      const b400 = is400Level(b) ? 1 : 0
      if (a400 !== b400) return b400 - a400
    }
    const aUnlock = unlockCounts.get(a) ?? 0
    const bUnlock = unlockCounts.get(b) ?? 0
    if (aUnlock !== bUnlock) return bUnlock - aUnlock
    return a.localeCompare(b, 'en-US')
  })
}
