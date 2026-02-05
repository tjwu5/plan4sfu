import type { PrereqRule } from './eligibilityEngine'
import { normalizeCourseCode } from '../courses/courseCode'

type NormalizedRule = {
  courseId: string
  allOf: string[]
  anyOf: string[]
}

type PrereqGraph = {
  getPrereqs: (courseCode: string) => string[]
  getUnlocks: (courseCode: string) => string[]
  getUnlockCount: (courseCode: string, depth?: 1 | 2) => number
  shortestUnlockPath: (
    fromCompletedSet: Set<string> | string[],
    targetCourse: string,
  ) => { path: string[]; missing: string[] }
}

const normalizeRule = (rule: PrereqRule): NormalizedRule => ({
  courseId: normalizeCourseCode(rule.courseId),
  allOf: (rule.allOf ?? []).map(normalizeCourseCode),
  anyOf: (rule.anyOf ?? []).map(normalizeCourseCode),
})

const ensureSet = (map: Map<string, Set<string>>, key: string) => {
  const existing = map.get(key)
  if (existing) return existing
  const next = new Set<string>()
  map.set(key, next)
  return next
}

export function buildPrereqGraph(prereqRulesJson: PrereqRule[]): PrereqGraph {
  const prereqsByCourse = new Map<string, Set<string>>()
  const unlocksByCourse = new Map<string, Set<string>>()
  const rulesByCourse = new Map<string, NormalizedRule>()

  prereqRulesJson.map(normalizeRule).forEach((rule) => {
    rulesByCourse.set(rule.courseId, rule)
    const prereqs = new Set<string>([...rule.allOf, ...rule.anyOf])
    prereqsByCourse.set(rule.courseId, prereqs)
    prereqs.forEach((prereq) => {
      ensureSet(unlocksByCourse, prereq).add(rule.courseId)
    })
  })

  const getPrereqs = (courseCode: string) => {
    const normalized = normalizeCourseCode(courseCode)
    return Array.from(prereqsByCourse.get(normalized) ?? []).sort()
  }

  const getUnlocks = (courseCode: string) => {
    const normalized = normalizeCourseCode(courseCode)
    return Array.from(unlocksByCourse.get(normalized) ?? []).sort()
  }

  const getUnlockCount = (courseCode: string, depth: 1 | 2 = 1) => {
    const normalized = normalizeCourseCode(courseCode)
    const visited = new Set<string>()
    let frontier = new Set<string>(getUnlocks(normalized))
    for (let step = 1; step <= depth; step += 1) {
      frontier.forEach((course) => visited.add(course))
      if (step === depth) break
      const next = new Set<string>()
      frontier.forEach((course) => {
        getUnlocks(course).forEach((unlock) => {
          if (!visited.has(unlock)) next.add(unlock)
        })
      })
      frontier = next
    }
    return visited.size
  }

  const getMissingFor = (course: string, completed: Set<string>) => {
    const rule = rulesByCourse.get(course)
    if (!rule) return [] as string[]
    const missing: string[] = rule.allOf.filter(
      (prereq) => !completed.has(prereq),
    )
    if (rule.anyOf.length > 0 && !rule.anyOf.some((p) => completed.has(p))) {
      missing.push(rule.anyOf[0])
    }
    return missing
  }

  const shortestUnlockPath = (
    fromCompletedSet: Set<string> | string[],
    targetCourse: string,
  ) => {
    const completed = new Set(
      Array.from(fromCompletedSet).map(normalizeCourseCode),
    )
    const target = normalizeCourseCode(targetCourse)

    if (completed.has(target)) {
      return { path: [], missing: [] }
    }

    const missing = getMissingFor(target, completed)
    const visited = new Set<string>()

    const buildPath = (course: string): string[] => {
      if (completed.has(course)) return []
      if (visited.has(course)) return [course]
      visited.add(course)
      const needed = getMissingFor(course, completed)
      if (needed.length === 0) return [course]
      // Best-effort: pick the first missing prereq to build a path.
      // This ignores additional AND requirements and does not explore all OR branches.
      return [...buildPath(needed[0]), course]
    }

    return {
      path: buildPath(target),
      missing,
    }
  }

  return {
    getPrereqs,
    getUnlocks,
    getUnlockCount,
    shortestUnlockPath,
  }
}
