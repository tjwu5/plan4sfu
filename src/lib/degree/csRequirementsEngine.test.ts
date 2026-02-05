import { describe, expect, it } from 'vitest'
import {
  computeConcentrationBlockers,
  evaluateCSRequirements,
  is400Level,
  loadConcentrationConfig,
  validateConcentrationConfig,
} from './csRequirementsEngine'

const getArea = (report: ReturnType<typeof evaluateCSRequirements>, area: string) =>
  report.concentrations.find((item) => item.area === area)

describe('csRequirementsEngine concentrations', () => {
  it('requires at least two 400-level courses for AI', () => {
    const report = evaluateCSRequirements({
      completedCourses: ['CMPT 310', 'CMPT 313', 'CMPT 322', 'CMPT 410'],
    })
    const ai = getArea(report, 'AI')
    expect(ai).toBeTruthy()
    expect(ai?.completed.length).toBe(4)
    expect(ai?.completed400.length).toBe(1)
    expect(ai?.isSatisfied).toBe(false)
    expect(ai?.missing400Count).toBe(1)
  })

  it('satisfies AI with four courses including two 400-level', () => {
    const report = evaluateCSRequirements({
      completedCourses: ['CMPT 310', 'CMPT 410', 'CMPT 413', 'CMPT 420'],
    })
    const ai = getArea(report, 'AI')
    expect(ai).toBeTruthy()
    expect(ai?.isSatisfied).toBe(true)
    expect(ai?.completed400.length).toBeGreaterThanOrEqual(2)
  })

  it('counts planned courses toward concentration progress', () => {
    const report = evaluateCSRequirements({
      completedCourses: ['CMPT 300', 'CMPT 307'],
      plannedCourses: ['CMPT 431', 'CMPT 435'],
    })
    const systems = getArea(report, 'Systems')
    expect(systems).toBeTruthy()
    expect(systems?.completed.length).toBe(4)
    expect(systems?.completed400.length).toBe(2)
    expect(systems?.isSatisfied).toBe(true)
  })

  it('treats CMPT 376W as non-400-level', () => {
    expect(is400Level('CMPT 376W')).toBe(false)
  })

  it('treats 4xx courses with suffix as 400-level', () => {
    expect(is400Level('CMPT 417W')).toBe(true)
  })

  it('validates concentration config entries', () => {
    const config = loadConcentrationConfig()
    expect(() => validateConcentrationConfig(config)).not.toThrow()
  })

  it('computes blockers excluding table courses and completed', () => {
    const blockers = computeConcentrationBlockers({
      areas: [{ area: 'AI', courses: ['CMPT 310', 'CMPT 410'] }],
      completed: new Set(['CMPT 120']),
      prereqRules: [
        { courseId: 'CMPT 310', allOf: ['CMPT 120', 'CMPT 125'] },
        { courseId: 'CMPT 410', allOf: ['CMPT 225', 'CMPT 310'] },
      ],
      maxBlockers: 8,
    })

    expect(blockers[0].blockers).toEqual([
      { course: 'CMPT 125', blocksCount: 1 },
      { course: 'CMPT 225', blocksCount: 1 },
    ])
  })

  it('ranks blockers by frequency', () => {
    const blockers = computeConcentrationBlockers({
      areas: [{ area: 'Systems', courses: ['CMPT 371', 'CMPT 431'] }],
      completed: new Set([]),
      prereqRules: [
        { courseId: 'CMPT 371', allOf: ['CMPT 225'] },
        { courseId: 'CMPT 431', allOf: ['CMPT 225', 'CMPT 300'] },
      ],
      maxBlockers: 8,
    })

    expect(blockers[0].blockers[0]).toEqual({
      course: 'CMPT 225',
      blocksCount: 2,
    })
  })
})
