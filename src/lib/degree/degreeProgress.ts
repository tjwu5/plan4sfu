import type { CompletedCourse, DegreePlan, Requirement } from '../../types'
import { normalizeCourseCode } from '../courses/courseCode'

export type RequirementStatus = Requirement & { satisfied: boolean }

const getCompletedCourseIds = (courses: CompletedCourse[]) =>
  new Set(courses.map((course) => normalizeCourseCode(course.course)))

export function getRequirementStatuses(
  plan: DegreePlan,
  courses: CompletedCourse[],
): RequirementStatus[] {
  const completed = getCompletedCourseIds(courses)
  return plan.requiredCourses.map((requirement) => ({
    ...requirement,
    courseId: normalizeCourseCode(requirement.courseId),
    satisfied: completed.has(normalizeCourseCode(requirement.courseId)),
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
