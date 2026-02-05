import { describe, expect, it } from 'vitest'
import { buildCourseUnlockModel } from './buildCourseUnlockModel'

const mockGraph = {
  getPrereqs: (courseCode: string) =>
    courseCode === 'CMPT 225' ? ['CMPT 125', 'CMPT 105W'] : [],
  getUnlockCount: (_courseCode: string, depth: 1 | 2 = 1) => (depth === 1 ? 2 : 5),
}

describe('buildCourseUnlockModel', () => {
  it('Locked course shows missing prereqs', () => {
    const model = buildCourseUnlockModel('CMPT 225', {
      completedCourses: ['CMPT 125'],
      prereqGraph: mockGraph,
      prereqRules: [{ courseId: 'CMPT 225', allOf: ['CMPT 125', 'CMPT 105W'] }],
    })

    expect(model.status).toBe('Locked')
    expect(model.missingPrereqs).toEqual(['CMPT 105W'])
  })

  it('Eligible course shows no missing prereqs', () => {
    const model = buildCourseUnlockModel('CMPT 225', {
      completedCourses: ['CMPT 125', 'CMPT 105W'],
      prereqGraph: mockGraph,
      prereqRules: [{ courseId: 'CMPT 225', allOf: ['CMPT 125', 'CMPT 105W'] }],
    })

    expect(model.status).toBe('Eligible')
    expect(model.missingPrereqs).toEqual([])
  })

  it('Computes unlock counts', () => {
    const model = buildCourseUnlockModel('CMPT 225', {
      completedCourses: [],
      prereqGraph: mockGraph,
      prereqRules: [{ courseId: 'CMPT 225' }],
    })

    expect(model.unlock1).toBe(2)
    expect(model.unlock2).toBe(5)
  })
})
