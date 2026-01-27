import type { DegreePlan, Requirement } from '../../types'

type DegreePlanJson = {
  name?: string
  faculty?: string
  major?: string
  requiredCourses?: string[]
}

const modules = import.meta.glob('../../data/major/*.json', { eager: true })

const normalizeRequirement = (courseId: string, index: number): Requirement => ({
  id: `${courseId}-${index}`,
  courseId,
})

export function loadDegreePlans(): DegreePlan[] {
  return Object.entries(modules).map(([path, module]) => {
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
}
