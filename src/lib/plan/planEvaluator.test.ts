import { describe, expect, it } from 'vitest'
import { buildPrereqGraph } from '../eligibility/prereqGraph'
import type { PrereqRule } from '../eligibility/eligibilityEngine'
import { evaluatePlan } from './planEvaluator'

const rules: PrereqRule[] = [
  { courseId: 'CMPT 120' },
  { courseId: 'CMPT 125', allOf: ['CMPT 120'] },
  { courseId: 'CMPT 225', allOf: ['CMPT 125'] },
  { courseId: 'CMPT 310', allOf: ['CMPT 225'] },
]

describe('planEvaluator', () => {
  it('reports infeasible courses and unlock impact', () => {
    const graph = buildPrereqGraph(rules)
    const report = evaluatePlan({
      profile: {},
      completedCourses: ['CMPT 120'],
      plan: {
        terms: [
          { id: 't1', label: 'Term 1', courses: ['CMPT 225'] },
          { id: 't2', label: 'Term 2', courses: ['CMPT 125'] },
        ],
      },
      prereqRules: rules,
      prereqGraph: graph,
    })

    expect(report.termReports[0].infeasible.length).toBe(1)
    expect(report.termReports[0].infeasible[0].course).toBe('CMPT 225')
    expect(report.termReports[0].unlockImpact[0].unlock1).toBeGreaterThanOrEqual(1)
  })
})
