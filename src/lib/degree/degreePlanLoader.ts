import type { DegreePlan, Requirement } from '../../types'

type DegreePlanJson = {
  name?: string
  faculty?: string
  major?: string
  requiredCourses?: string[]
}

// cmpt_cs_requirements.json is the source of truth going forward.
// cmpt_major.json is kept for legacy/backward compatibility only.
const modules = import.meta.glob('../../data/major/*.json', { eager: true })
const requirementsModules = import.meta.glob('../../data/requirements/*.json', {
  eager: true,
})

type RequirementsJson = {
  tableIAreas?: Array<{ area: string; courses: string[] }>
  breadth?: { requiredCourse?: string }
  name?: string
  faculty?: string
  major?: string
}

const normalizeRequirement = (courseId: string, index: number): Requirement => ({
  id: `${courseId}-${index}`,
  courseId,
})

const loadRequirementsPlan = () => {
  const match = Object.entries(requirementsModules).find(([path]) =>
    path.endsWith('cmpt_cs_requirements.json'),
  )
  if (!match) return null
  const data = (match[1] as { default?: RequirementsJson }).default ?? {}
  const areaCourses =
    data.tableIAreas?.flatMap((area) => area.courses) ?? []
  const requiredCourse = data.breadth?.requiredCourse
  const requiredCourses = requiredCourse
    ? [requiredCourse, ...areaCourses]
    : areaCourses

  return {
    id: 'cmpt_cs_requirements',
    name: 'CS Requirements (calendar-driven)',
    faculty: data.faculty,
    major: data.major,
    requiredCourses: requiredCourses.map(normalizeRequirement),
  } satisfies DegreePlan
}

export function loadDegreePlans(): DegreePlan[] {
  const legacyPlans = Object.entries(modules).map(([path, module]) => {
    const data = (module as { default?: DegreePlanJson }).default ?? {}
    const fileName = path.split('/').pop() ?? 'plan'
    const id = fileName.replace('.json', '')
    const requiredCourses = data.requiredCourses ?? []
    return {
      id,
      name: data.name ?? id,
      faculty: data.faculty,
      major: data.major,
      requiredCourses: requiredCourses.map(normalizeRequirement),
    }
  })
  const requirementsPlan = loadRequirementsPlan()
  return requirementsPlan ? [requirementsPlan, ...legacyPlans] : legacyPlans
}
