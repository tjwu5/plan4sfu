import { describe, expect, it } from 'vitest'
import { rankConcentrationNextPicks } from './concentrationNextPicks'
import { is400Level } from './csRequirementsEngine'

describe('rankConcentrationNextPicks', () => {
  it('prefers 400-level courses when needed', () => {
    const unlockCounts = new Map([
      ['CMPT 310', 10],
      ['CMPT 410', 1],
    ])
    const ordered = rankConcentrationNextPicks({
      eligibleCourses: ['CMPT 310', 'CMPT 410'],
      need400: true,
      unlockCounts,
      is400Level,
    })
    expect(ordered[0]).toBe('CMPT 410')
  })

  it('orders by unlock count when 400-level tie', () => {
    const unlockCounts = new Map([
      ['CMPT 410', 3],
      ['CMPT 417', 7],
    ])
    const ordered = rankConcentrationNextPicks({
      eligibleCourses: ['CMPT 417', 'CMPT 410'],
      need400: true,
      unlockCounts,
      is400Level,
    })
    expect(ordered[0]).toBe('CMPT 417')
  })

  it('uses alphabetical order as tie-breaker', () => {
    const unlockCounts = new Map([
      ['CMPT 310', 2],
      ['CMPT 320', 2],
    ])
    const ordered = rankConcentrationNextPicks({
      eligibleCourses: ['CMPT 320', 'CMPT 310'],
      need400: false,
      unlockCounts,
      is400Level,
    })
    expect(ordered[0]).toBe('CMPT 310')
  })
})
