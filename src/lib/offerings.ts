import type { Offering } from '../types'
import type { OutlinesSectionDetail } from '../types/sfuOutlines'
import { normalizeCourseCode, splitCourseCode } from './courses/courseCode'

type NormalizeMeta = {
  year: number
  term: string
  dept: string
  number: string
  section: string
}

const parseDays = (days?: string) => {
  if (!days) return []
  const matches = days.match(/[A-Z][a-z]?/g)
  return matches ?? []
}

const parseMinutes = (time?: string) => {
  if (!time) return 0
  const [hours, minutes] = time.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

export function normalizeSectionDetailToOfferings(
  detail: OutlinesSectionDetail,
  meta: NormalizeMeta,
): Offering[] {
  const normalizedCourseId = normalizeCourseCode(`${meta.dept} ${meta.number}`)
  const { dept, num } = splitCourseCode(normalizedCourseId)
  const scheduleBlocks = detail.schedule ?? []
  if (scheduleBlocks.length === 0) {
    return [
      {
        courseId: normalizedCourseId,
        dept,
        number: num,
        title: detail.info?.title,
        section: meta.section,
        campus: undefined,
        days: [],
        startMinutes: 0,
        endMinutes: 0,
        instructors: detail.instructor ?? [],
        term: { year: meta.year, term: meta.term },
        raw: detail,
      },
    ]
  }

  return scheduleBlocks.map((block) => ({
    courseId: normalizedCourseId,
    dept,
    number: num,
    title: detail.info?.title,
    section: meta.section,
    campus: block.campus,
    days: parseDays(block.days),
    startMinutes: parseMinutes(block.startTime),
    endMinutes: parseMinutes(block.endTime),
    instructors: detail.instructor ?? [],
    term: { year: meta.year, term: meta.term },
    raw: block,
  }))
}
