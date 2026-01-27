import type { Offering } from '../types'

type FilterPrefs = {
  campus: string
  avoid830: boolean
}

export function filterOfferings(offerings: Offering[], prefs: FilterPrefs) {
  return offerings.filter((offering) => {
    if (prefs.campus !== 'Any' && offering.campus !== prefs.campus) {
      return false
    }
    if (prefs.avoid830 && offering.startMinutes <= 510) {
      return false
    }
    return true
  })
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd

export function hasConflict(a: Offering, b: Offering) {
  const sharedDays = a.days.filter((day) => b.days.includes(day))
  if (sharedDays.length === 0) return false
  return overlaps(a.startMinutes, a.endMinutes, b.startMinutes, b.endMinutes)
}

export function findConflicts(offerings: Offering[]) {
  const conflicts: { a: Offering; b: Offering; message: string }[] = []
  for (let i = 0; i < offerings.length; i += 1) {
    for (let j = i + 1; j < offerings.length; j += 1) {
      const first = offerings[i]
      const second = offerings[j]
      if (hasConflict(first, second)) {
        conflicts.push({
          a: first,
          b: second,
          message: `${first.courseId} ${first.section} conflicts with ${second.courseId} ${second.section}`,
        })
      }
    }
  }
  return conflicts
}
