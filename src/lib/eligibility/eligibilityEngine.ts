import type { CompletedCourse } from '../../types'

export type PrereqRule = {
  courseId: string
  allOf?: string[]
  anyOf?: string[]
}

const normalizeCourseId = (courseId: string) =>
  courseId.replace(/\s+/g, '').toUpperCase()

const buildCompletedSet = (courses: CompletedCourse[]) =>
  new Set(courses.map((course) => normalizeCourseId(course.course)))

export function isEligibleForCourse(
  rule: PrereqRule,
  completed: Set<string>,
) {
  const allOf = rule.allOf ?? []
  const anyOf = rule.anyOf ?? []

  const satisfiesAll = allOf.every((courseId) =>
    completed.has(normalizeCourseId(courseId)),
  )
  const satisfiesAny =
    anyOf.length === 0 ||
    anyOf.some((courseId) => completed.has(normalizeCourseId(courseId)))

  return satisfiesAll && satisfiesAny
}

export function getEligibleCourses(
  rules: PrereqRule[],
  courses: CompletedCourse[],
) {
  const completed = buildCompletedSet(courses)
  return rules
    .filter((rule) => !completed.has(normalizeCourseId(rule.courseId)))
    .filter((rule) => isEligibleForCourse(rule, completed))
    .map((rule) => rule.courseId)
}
