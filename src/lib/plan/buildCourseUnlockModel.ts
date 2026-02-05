import { normalizeCourseCode } from '../courses/courseCode'
import { loadPrereqGraph, loadPrereqRules } from '../eligibility/prereqRulesLoader'
import type { PrereqRule } from '../eligibility/eligibilityEngine'

type PrereqGraph = {
  getPrereqs: (courseCode: string) => string[]
  getUnlockCount: (courseCode: string, depth?: 1 | 2) => number
}

export type CourseUnlockModel = {
  course: string
  title?: string
  status: 'Eligible' | 'Locked'
  prereqs: Array<{ code: string; status: 'completed' | 'in plan' | 'missing' }>
  missingPrereqs: string[]
  unlock1: number
  unlock2: number
  prereqRaw?: string
}

type BuildCourseUnlockModelInput = {
  completedCourses: string[]
  plannedCourses?: string[]
  prereqRules?: PrereqRule[]
  prereqGraph?: PrereqGraph
  title?: string
}

const normalizeRule = (rule: PrereqRule) => ({
  courseId: normalizeCourseCode(rule.courseId),
  allOf: (rule.allOf ?? []).map(normalizeCourseCode),
  anyOf: (rule.anyOf ?? []).map(normalizeCourseCode),
  prereqRaw: rule.prereqRaw,
})

const getMissingPrereqs = (rule: ReturnType<typeof normalizeRule>, completed: Set<string>) => {
  const missingAll = rule.allOf.filter((courseId) => !completed.has(courseId))
  const missingAny =
    rule.anyOf.length > 0 && !rule.anyOf.some((courseId) => completed.has(courseId))
      ? [...rule.anyOf]
      : []
  return Array.from(new Set([...missingAll, ...missingAny]))
}

export function buildCourseUnlockModel(
  courseCode: string,
  userData: BuildCourseUnlockModelInput,
): CourseUnlockModel {
  const course = normalizeCourseCode(courseCode)
  const completedSet = new Set(
    userData.completedCourses.map(normalizeCourseCode),
  )
  const plannedSet = new Set(
    (userData.plannedCourses ?? []).map(normalizeCourseCode),
  )
  const inPlanSet = new Set([...completedSet, ...plannedSet])

  const prereqRules = userData.prereqRules ?? loadPrereqRules()
  const prereqGraph = userData.prereqGraph ?? loadPrereqGraph()
  const normalizedRules = prereqRules.map(normalizeRule)
  const rule = normalizedRules.find((r) => r.courseId === course)

  const prereqList = prereqGraph.getPrereqs(course)
  const prereqs = prereqList.map((code) => {
    if (completedSet.has(code)) return { code, status: 'completed' as const }
    if (plannedSet.has(code)) return { code, status: 'in plan' as const }
    return { code, status: 'missing' as const }
  })

  const missingPrereqs = rule
    ? getMissingPrereqs(rule, inPlanSet)
    : prereqList.filter((code) => !inPlanSet.has(code))

  const status: CourseUnlockModel['status'] =
    missingPrereqs.length === 0 ? 'Eligible' : 'Locked'

  return {
    course,
    title: userData.title,
    status,
    prereqs,
    missingPrereqs,
    unlock1: prereqGraph.getUnlockCount(course, 1),
    unlock2: prereqGraph.getUnlockCount(course, 2),
    prereqRaw: rule?.prereqRaw,
  }
}
