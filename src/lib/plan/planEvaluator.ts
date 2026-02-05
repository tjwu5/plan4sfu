import { normalizeCourseCode } from '../courses/courseCode'
import type { PrereqRule } from '../eligibility/eligibilityEngine'
import type { CSRequirementsReport } from '../degree/csRequirementsEngine'
import { evaluateCSRequirements } from '../degree/csRequirementsEngine'

type PrereqGraph = {
  getUnlockCount: (courseCode: string, depth?: 1 | 2) => number
}

export type Plan = {
  terms: Array<{ id: string; label: string; courses: string[] }>
}

export type PlanEvaluationReport = {
  overall: {
    infeasibleCount: number
    flexibilityAvg: number
    efficiency: number
  }
  termReports: Array<{
    termId: string
    infeasible: Array<{
      course: string
      missingPrereqs: string[]
      prereqRaw?: string
    }>
    unlockImpact: Array<{ course: string; unlock1: number; unlock2: number }>
    flexibility: { count: number; examples: string[] }
    progress: {
      addedTowardsConcentration: Array<{ area: string; courses: string[] }>
      requirementsAdvanced: string[]
    }
    explanations: string[]
  }>
}

type EligibilityRule = {
  courseId: string
  allOf: string[]
  anyOf: string[]
  prereqRaw?: string
}

const normalizeRules = (rules: PrereqRule[]): EligibilityRule[] =>
  rules.map((rule) => ({
    courseId: normalizeCourseCode(rule.courseId),
    allOf: (rule.allOf ?? []).map(normalizeCourseCode),
    anyOf: (rule.anyOf ?? []).map(normalizeCourseCode),
    prereqRaw: rule.prereqRaw,
  }))

const isEligible = (rule: EligibilityRule, completed: Set<string>) => {
  const satisfiesAll = rule.allOf.every((courseId) => completed.has(courseId))
  const satisfiesAny =
    rule.anyOf.length === 0 || rule.anyOf.some((courseId) => completed.has(courseId))
  return satisfiesAll && satisfiesAny
}

const getMissingPrereqs = (rule: EligibilityRule, completed: Set<string>) => {
  const missingAll = rule.allOf.filter((courseId) => !completed.has(courseId))
  const missingAny =
    rule.anyOf.length > 0 && !rule.anyOf.some((courseId) => completed.has(courseId))
      ? [...rule.anyOf]
      : []
  return Array.from(new Set([...missingAll, ...missingAny]))
}

const getRequirementsDelta = (
  before: CSRequirementsReport,
  after: CSRequirementsReport,
) => {
  const beforeLower = new Set(before.lowerDiv.missing)
  const afterLower = new Set(after.lowerDiv.missing)
  const beforeUpper = new Set(before.upperDivCore.missing)
  const afterUpper = new Set(after.upperDivCore.missing)

  const requirementsAdvanced = [
    ...Array.from(beforeLower).filter((course) => !afterLower.has(course)),
    ...Array.from(beforeUpper).filter((course) => !afterUpper.has(course)),
  ]

  const addedTowardsConcentration = after.concentrations.map((area, index) => {
    const beforeArea = before.concentrations[index]
    const newlyAdded = area.completed.filter(
      (course) => !beforeArea.completed.includes(course),
    )
    return { area: area.area, courses: newlyAdded }
  })

  return { requirementsAdvanced, addedTowardsConcentration }
}

const advancesRequirements = (
  before: CSRequirementsReport,
  after: CSRequirementsReport,
) => {
  if (after.lowerDiv.missing.length < before.lowerDiv.missing.length) return true
  if (after.upperDivCore.missing.length < before.upperDivCore.missing.length) return true
  return after.concentrations.some((area, index) => {
    const prev = before.concentrations[index]
    return (
      area.missingCoursesCount < prev.missingCoursesCount ||
      area.missing400Count < prev.missing400Count
    )
  })
}

export function evaluatePlan({
  profile,
  completedCourses,
  plan,
  prereqRules,
  prereqGraph,
}: {
  profile: unknown
  completedCourses: string[]
  plan: Plan
  prereqRules: PrereqRule[]
  prereqGraph: PrereqGraph
}): PlanEvaluationReport {
  const normalizedCompleted = completedCourses.map(normalizeCourseCode)
  const rules = normalizeRules(prereqRules)
  const ruleMap = new Map(rules.map((rule) => [rule.courseId, rule]))

  let runningCompleted = new Set(normalizedCompleted)
  let totalInfeasible = 0
  let totalFlex = 0
  let totalPlanned = 0
  let totalAdvanced = 0

  const termReports = plan.terms.map((term) => {
    const termCourses = term.courses.map(normalizeCourseCode)
    totalPlanned += termCourses.length

    const infeasible = termCourses
      .map((course) => {
        const rule = ruleMap.get(course)
        if (!rule) return null
        const missingPrereqs = getMissingPrereqs(rule, runningCompleted)
        if (missingPrereqs.length === 0) return null
        return {
          course,
          missingPrereqs,
          prereqRaw: rule.prereqRaw,
        }
      })
      .filter(Boolean) as PlanEvaluationReport['termReports'][number]['infeasible']

    totalInfeasible += infeasible.length

    const unlockImpact = termCourses.map((course) => ({
      course,
      unlock1: prereqGraph.getUnlockCount(course, 1),
      unlock2: prereqGraph.getUnlockCount(course, 2),
    }))

    const beforeReport = evaluateCSRequirements({
      completedCourses: Array.from(runningCompleted),
    })

    const afterReport = evaluateCSRequirements({
      completedCourses: Array.from(
        new Set([...runningCompleted, ...termCourses]),
      ),
    })

    const { requirementsAdvanced, addedTowardsConcentration } =
      getRequirementsDelta(beforeReport, afterReport)

    const eligible = rules
      .filter(
        (rule) =>
          !runningCompleted.has(rule.courseId) &&
          !termCourses.includes(rule.courseId) &&
          isEligible(rule, runningCompleted),
      )
      .map((rule) => rule.courseId)

    const flexibilityCandidates = eligible.filter((course) => {
      const nextReport = evaluateCSRequirements({
        completedCourses: [...Array.from(runningCompleted), course],
      })
      return advancesRequirements(beforeReport, nextReport)
    })

    totalFlex += flexibilityCandidates.length
    totalAdvanced += termCourses.filter((course) => {
      const nextReport = evaluateCSRequirements({
        completedCourses: [...Array.from(runningCompleted), course],
      })
      return advancesRequirements(beforeReport, nextReport)
    }).length

    const explanations = [
      `Infeasible courses: ${infeasible.length}`,
      `Flexibility options: ${flexibilityCandidates.length}`,
      `Top unlock (depth 2): ${
        unlockImpact.sort((a, b) => b.unlock2 - a.unlock2)[0]?.course ?? 'N/A'
      }`,
      `Requirements advanced: ${requirementsAdvanced.length}`,
    ].slice(0, 4)

    runningCompleted = new Set([...runningCompleted, ...termCourses])

    return {
      termId: term.id,
      infeasible,
      unlockImpact,
      flexibility: {
        count: flexibilityCandidates.length,
        examples: flexibilityCandidates.slice(0, 3),
      },
      progress: {
        addedTowardsConcentration: addedTowardsConcentration.filter(
          (item) => item.courses.length > 0,
        ),
        requirementsAdvanced,
      },
      explanations,
    }
  })

  const flexibilityAvg =
    plan.terms.length === 0 ? 0 : Math.round(totalFlex / plan.terms.length)
  const efficiency = totalPlanned === 0 ? 0 : totalAdvanced / totalPlanned

  return {
    overall: {
      infeasibleCount: totalInfeasible,
      flexibilityAvg,
      efficiency,
    },
    termReports,
  }
}
