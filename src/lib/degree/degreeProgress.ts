import type { CompletedCourse, DegreePlan, Requirement } from '../../types'

export type RequirementStatus = Requirement & { satisfied: boolean }

const normalizeCourseId = (courseId: string) =>
  courseId.replace(/\s+/g, '').toUpperCase()

const getCompletedCourseIds = (courses: CompletedCourse[]) =>
  new Set(courses.map((course) => normalizeCourseId(course.course)))

export function getRequirementStatuses(
  plan: DegreePlan,
  courses: CompletedCourse[],
): RequirementStatus[] {
  const completed = getCompletedCourseIds(courses)
  return plan.requiredCourses.map((requirement) => ({
    ...requirement,
    satisfied: completed.has(normalizeCourseId(requirement.courseId)),
  }))
}

export function summarizeProgress(statuses: RequirementStatus[]) {
  const total = statuses.length
  const completed = statuses.filter((item) => item.satisfied).length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { total, completed, percent }
}

export function getRemainingRequirements(statuses: RequirementStatus[]) {
  return statuses.filter((item) => !item.satisfied)
}
