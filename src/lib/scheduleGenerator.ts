import type { Offering } from '../types'
import { filterOfferings, hasConflict } from './scheduleLogic'

type GeneratorPrefs = {
  campus: string
  avoid830: boolean
}

export function generateSchedules(
  selectedCourseIds: string[],
  offeringsByCourse: Record<string, Offering[]>,
  prefs: GeneratorPrefs,
) {
  const schedules: Offering[][] = []

  const buildSchedule = (courseIndex: number, current: Offering[]) => {
    if (schedules.length >= 3) return
    if (courseIndex >= selectedCourseIds.length) {
      schedules.push([...current])
      return
    }

    const courseId = selectedCourseIds[courseIndex]
    const offerings = filterOfferings(offeringsByCourse[courseId] ?? [], prefs)
    for (const offering of offerings) {
      const hasAnyConflict = current.some((existing) =>
        hasConflict(existing, offering),
      )
      if (hasAnyConflict) continue
      current.push(offering)
      buildSchedule(courseIndex + 1, current)
      current.pop()
      if (schedules.length >= 3) return
    }
  }

  buildSchedule(0, [])
  return schedules
}
