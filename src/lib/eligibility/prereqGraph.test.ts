import { describe, expect, it } from 'vitest'
import { buildPrereqGraph } from './prereqGraph'
import type { PrereqRule } from './eligibilityEngine'

const mockRules: PrereqRule[] = [
  { courseId: 'CMPT 125', allOf: ['CMPT120'] },
  {
    courseId: 'CMPT 225',
    allOf: ['cmpt 125'],
    anyOf: ['MACM 101', 'MATH-150'],
  },
  { courseId: 'CMPT 295', allOf: ['CMPT 225'] },
  { courseId: 'CMPT 310', allOf: ['CMPT 225', 'CMPT 276'] },
  { courseId: 'CMPT 400', allOf: ['CMPT 295'] },
]

describe('prereqGraph', () => {
  it('returns prereqs and unlocks', () => {
    const graph = buildPrereqGraph(mockRules)
    expect(graph.getPrereqs('cmpt225')).toEqual([
      'CMPT 125',
      'MACM 101',
      'MATH 150',
    ])
    expect(graph.getUnlocks('CMPT 225')).toEqual(['CMPT 295', 'CMPT 310'])
  })

  it('counts unlocks by depth', () => {
    const graph = buildPrereqGraph(mockRules)
    expect(graph.getUnlockCount('CMPT 225', 1)).toBe(2)
    expect(graph.getUnlockCount('CMPT 225', 2)).toBe(3)
  })
})
