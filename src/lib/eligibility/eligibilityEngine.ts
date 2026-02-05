import type { CompletedCourse } from '../../types'
import { normalizeCourseCode } from '../courses/courseCode'

export type PrereqRule = {
  courseId: string
  allOf?: string[]
  anyOf?: string[]
  prereqRaw?: string
}

const buildCompletedSet = (courses: CompletedCourse[]) =>
  new Set(courses.map((course) => normalizeCourseCode(course.course)))

const normalizeRule = (rule: PrereqRule) => ({
  courseId: normalizeCourseCode(rule.courseId),
  allOf: (rule.allOf ?? []).map(normalizeCourseCode),
  anyOf: (rule.anyOf ?? []).map(normalizeCourseCode),
  prereqRaw: rule.prereqRaw,
})

export function isEligibleForCourse(
  rule: PrereqRule,
  completed: Set<string>,
) {
  const { allOf, anyOf } = normalizeRule(rule)

  const satisfiesAll = allOf.every((courseId) => completed.has(courseId))
  const satisfiesAny =
    anyOf.length === 0 ||
    anyOf.some((courseId) => completed.has(courseId))

  return satisfiesAll && satisfiesAny
}

type EligibilityReportItem = {
  course: string
  missingPrereqs: string[]
  reasonText: string
  prereqRaw?: string
}

export function getEligibilityReport(
  _profile: unknown,
  courses: CompletedCourse[],
  rules: PrereqRule[],
  _opts?: {
    includePrereqRaw?: boolean
  },
) {
  const completed = buildCompletedSet(courses)
  const eligible: string[] = []
  const ineligible: EligibilityReportItem[] = []

  rules.map(normalizeRule).forEach((rule) => {
    if (completed.has(rule.courseId)) return
    const satisfiesAll = rule.allOf.every((courseId) => completed.has(courseId))
    const satisfiesAny =
      rule.anyOf.length === 0 ||
      rule.anyOf.some((courseId) => completed.has(courseId))

    if (satisfiesAll && satisfiesAny) {
      eligible.push(rule.courseId)
      return
    }

    const missingAll = rule.allOf.filter((courseId) => !completed.has(courseId))
    const missingAny =
      rule.anyOf.length > 0 && !satisfiesAny ? [...rule.anyOf] : []
    const missingPrereqs = Array.from(
      new Set([...missingAll, ...missingAny]),
    )

    let reasonText = 'Prerequisites not satisfied.'
    if (missingAll.length > 0 && missingAny.length > 0) {
      reasonText = `Missing prerequisites: ${missingAll.join(
        ', ',
      )}; and one of: ${missingAny.join(', ')}`
    } else if (missingAll.length > 0) {
      reasonText = `Missing prerequisites: ${missingAll.join(', ')}`
    } else if (missingAny.length > 0) {
      reasonText = `Missing one of: ${missingAny.join(', ')}`
    }

    ineligible.push({
      course: rule.courseId,
      missingPrereqs,
      reasonText,
      prereqRaw: rule.prereqRaw,
    })
  })

  return { eligible, ineligible }
}

export function getEligibleCourses(
  rules: PrereqRule[],
  courses: CompletedCourse[],
) {
  return getEligibilityReport(null, courses, rules).eligible
}
