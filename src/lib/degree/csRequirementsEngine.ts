import {
  isValidCourseCode,
  normalizeCourseCode,
  splitCourseCode,
} from '../courses/courseCode'
import { loadPrereqRules } from '../eligibility/prereqRulesLoader'
import type { PrereqRule } from '../eligibility/eligibilityEngine'

type RequirementBucket = {
  completed: string[]
  missing: string[]
}

export type CSRequirementsReport = {
  lowerDiv: RequirementBucket
  upperDivCore: RequirementBucket
  writingRequirement?: { completed: boolean; candidates: string[] }
  concentrations: Array<{
    area: string
    completed: string[]
    completed400: string[]
    allCourses: string[]
    blockers: Array<{ course: string; blocksCount: number }>
    missingCount: number
    missingCoursesCount: number
    missing400Count: number
    isSatisfied: boolean
  }>
  bestConcentrationOptions: Array<{
    area: string
    score: number
    rationale: string
  }>
}

type ConcentrationArea = {
  area: string
  courses: string[]
}

type ConcentrationConfig = {
  areas?: ConcentrationArea[]
}

const majorModules = import.meta.glob('../../data/major/*.json', { eager: true })
const requirementModules = import.meta.glob('../../data/requirements/*.json', {
  eager: true,
})

type RequirementsJson = {
  tableIAreas?: Array<{ area: string; courses: string[] }>
  breadth?: { requiredCourse?: string }
  lowerDivision?: {
    allOf?: string[]
    oneOf?: string[][]
  }
  name?: string
  faculty?: string
  major?: string
}

const loadJsonByName = <T,>(
  modules: Record<string, unknown>,
  fileName: string,
  fallback: T,
) => {
  const match = Object.entries(modules).find(([path]) =>
    path.endsWith(fileName),
  )
  if (!match) return fallback
  const data = (match[1] as { default?: T }).default
  return data ?? fallback
}

const normalizeCourseCodeStrict = (courseCode: string) => {
  const normalized = normalizeCourseCode(courseCode.trim().replace(/\s+/g, ' '))
  const { dept, num } = splitCourseCode(normalized)
  return dept && num ? `${dept} ${num}` : normalized
}

export const normalizeList = (courseCodes: string[]) =>
  Array.from(
    new Set(
      courseCodes
        .map((course) => normalizeCourseCodeStrict(course))
        .filter((course) => course.length > 0),
    ),
  )

export const is400Level = (courseCode: string) => {
  const { num } = splitCourseCode(courseCode)
  const numeric = Number.parseInt(num.replace(/\D/g, ''), 10)
  return !Number.isNaN(numeric) && numeric >= 400 && numeric <= 499
}

const UPPER_DIV_CORE: string[] = []

export const validateConcentrationConfig = (config: ConcentrationConfig) => {
  const errors: string[] = []
  config.areas?.forEach((area) => {
    area.courses.forEach((course) => {
      const normalized = normalizeCourseCode(course)
      if (normalized !== course) {
        errors.push(`${area.area}: "${course}" should be "${normalized}"`)
      }
      if (!isValidCourseCode(course)) {
        errors.push(`${area.area}: "${course}" is not a valid course code`)
      }
    })
  })

  if (errors.length > 0) {
    throw new Error(`Invalid concentration config:\n${errors.join('\n')}`)
  }
}

export const loadConcentrationConfig = () =>
  loadJsonByName<ConcentrationConfig>(
    requirementModules,
    'cmpt_concentrations.json',
    { areas: [] },
  )

const normalizeConcentrationConfig = (config: ConcentrationConfig) => ({
  areas: (config.areas ?? []).map((area) => ({
    ...area,
    courses: normalizeList(area.courses),
  })),
})

const normalizePrereqRules = (rules: PrereqRule[]) =>
  rules.map((rule) => ({
    courseId: normalizeCourseCode(rule.courseId),
    allOf: (rule.allOf ?? []).map(normalizeCourseCode),
    anyOf: (rule.anyOf ?? []).map(normalizeCourseCode),
  }))

export const computeConcentrationBlockers = ({
  areas,
  completed,
  prereqRules,
  maxBlockers = 8,
}: {
  areas: ConcentrationArea[]
  completed: Set<string>
  prereqRules: PrereqRule[]
  maxBlockers?: number
}) => {
  const rules = normalizePrereqRules(prereqRules)
  const ruleMap = new Map(rules.map((rule) => [rule.courseId, rule]))

  return areas.map((area) => {
    const areaCourses = normalizeList(area.courses)
    const areaSet = new Set(areaCourses)
    const counts = new Map<string, number>()

    areaCourses.forEach((course) => {
      const rule = ruleMap.get(course)
      if (!rule) return
      const prereqs = [...rule.allOf, ...rule.anyOf]
      prereqs.forEach((prereq) => {
        if (completed.has(prereq)) return
        if (areaSet.has(prereq)) return
        counts.set(prereq, (counts.get(prereq) ?? 0) + 1)
      })
    })

    return {
      area: area.area,
      blockers: Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en-US'))
        .slice(0, maxBlockers)
        .map(([course, blocksCount]) => ({ course, blocksCount })),
    }
  })
}

export function evaluateCSRequirements({
  completedCourses,
  plannedCourses,
}: {
  completedCourses: string[]
  plannedCourses?: string[]
}): CSRequirementsReport {
  const majorConfig = loadJsonByName<{ requiredCourses?: string[] }>(
    majorModules,
    'cmpt_major.json',
    { requiredCourses: [] },
  )
  const concentrationConfig = normalizeConcentrationConfig(
    loadConcentrationConfig(),
  )
  if (!import.meta.env?.PROD) {
    validateConcentrationConfig(concentrationConfig)
  }
  const requirementsConfig = loadJsonByName<RequirementsJson>(
    requirementModules,
    'cmpt_cs_requirements.json',
    {},
  )

  const completed = normalizeList(completedCourses)
  const planned = normalizeList(plannedCourses ?? [])
  const inPlanSet = new Set([...completed, ...planned])
  const prereqRules = loadPrereqRules()

  const lowerDivCourses = normalizeList(
    requirementsConfig.lowerDivision?.allOf ??
      (majorConfig as { requiredCourses?: string[] }).requiredCourses ??
      [],
  )
  const upperDivCourses = normalizeList(UPPER_DIV_CORE)

  const buildBucket = (
    required: string[],
    oneOfGroups?: string[][],
  ): RequirementBucket => {
    const completed = required.filter((course) => inPlanSet.has(course))
    const missing = required.filter((course) => !inPlanSet.has(course))

    if (oneOfGroups) {
      oneOfGroups.forEach((group) => {
        const normalizedGroup = normalizeList(group)
        const satisfied = normalizedGroup.find((course) =>
          inPlanSet.has(course),
        )
        if (satisfied) {
          completed.push(satisfied)
        } else {
          missing.push(`One of: ${normalizedGroup.join(' / ')}`)
        }
      })
    }

    return {
      completed,
      missing,
    }
  }

  const concentrations = concentrationConfig.areas ?? []

  const blockerResults = computeConcentrationBlockers({
    areas: concentrations,
    completed: inPlanSet,
    prereqRules,
  })

  const concentrationReports = concentrations.map((area, index) => {
    const areaCourses = normalizeList(area.courses)
    const completedCoursesInArea = areaCourses.filter((course) =>
      inPlanSet.has(course),
    )
    const completed400 = completedCoursesInArea.filter((course) =>
      is400Level(course),
    )
    const missingCoursesCount = Math.max(0, 4 - completedCoursesInArea.length)
    const missing400Count = Math.max(0, 2 - completed400.length)
    const missingCount = missingCoursesCount
    const isSatisfied =
      completedCoursesInArea.length >= 4 && completed400.length >= 2

    return {
      area: area.area,
      completed: completedCoursesInArea,
      completed400,
      allCourses: areaCourses,
      blockers: blockerResults[index]?.blockers ?? [],
      missingCount,
      missingCoursesCount,
      missing400Count,
      isSatisfied,
    }
  })

  const bestConcentrationOptions = [...concentrationReports]
    .map((report) => {
      const score =
        Math.min(4, report.completed.length) +
        Math.min(2, report.completed400.length) * 0.5
      return {
        area: report.area,
        score,
        rationale: `${report.completed.length} of 4 courses, ${report.completed400.length} of 2 at 400-level.`,
      }
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.area.localeCompare(b.area, 'en-US'),
    )

  return {
    lowerDiv: buildBucket(
      lowerDivCourses,
      requirementsConfig.lowerDivision?.oneOf,
    ),
    upperDivCore: buildBucket(upperDivCourses),
    concentrations: concentrationReports,
    bestConcentrationOptions,
  }
}
