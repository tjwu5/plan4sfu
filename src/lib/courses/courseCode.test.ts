import { describe, expect, it } from 'vitest'
import {
  isValidCourseCode,
  normalizeCourseCode,
  splitCourseCode,
} from './courseCode'

describe('courseCode normalization', () => {
  it('normalizes compact lowercase input', () => {
    expect(normalizeCourseCode('cmpt410')).toBe('CMPT 410')
  })

  it('normalizes hyphenated input', () => {
    expect(normalizeCourseCode('CMPT-410')).toBe('CMPT 410')
  })

  it('normalizes spaced input', () => {
    expect(normalizeCourseCode('CMPT 410')).toBe('CMPT 410')
  })

  it('normalizes mixed case input', () => {
    expect(normalizeCourseCode('cmpt 410')).toBe('CMPT 410')
  })

  it('preserves suffix letters', () => {
    expect(normalizeCourseCode('CMPT410W')).toBe('CMPT 410W')
  })

  it('preserves suffix with separators', () => {
    expect(normalizeCourseCode('cmpt-410w')).toBe('CMPT 410W')
  })

  it('preserves suffix with whitespace', () => {
    expect(normalizeCourseCode('cmpt 410 w')).toBe('CMPT 410W')
  })

  it('normalizes 4-letter department codes', () => {
    expect(normalizeCourseCode('ENSC120')).toBe('ENSC 120')
  })

  it('normalizes extra spacing', () => {
    expect(normalizeCourseCode('  stat   270  ')).toBe('STAT 270')
  })

  it('normalizes 2-letter department codes', () => {
    expect(normalizeCourseCode('ma-120')).toBe('MA 120')
  })
})

describe('courseCode helpers', () => {
  it('splits normalized course codes', () => {
    expect(splitCourseCode('CMPT 410W')).toEqual({ dept: 'CMPT', num: '410W' })
  })

  it('validates course codes', () => {
    expect(isValidCourseCode('CMPT 410')).toBe(true)
    expect(isValidCourseCode('410CMPT')).toBe(false)
  })
})
