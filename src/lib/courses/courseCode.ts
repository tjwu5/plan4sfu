type ParsedCourseCode = {
  dept: string
  num: string
}

const COURSE_CODE_PATTERN =
  /^\s*([A-Za-z]{2,4})\s*[-_ ]*\s*(\d{2,3})\s*([A-Za-z]?)\s*$/

const parseCourseCode = (input: string): ParsedCourseCode | null => {
  const match = input.match(COURSE_CODE_PATTERN)
  if (!match) return null
  const dept = match[1].toUpperCase()
  const suffix = match[3] ? match[3].toUpperCase() : ''
  return {
    dept,
    num: `${match[2]}${suffix}`,
  }
}

export function normalizeCourseCode(input: string) {
  const parsed = parseCourseCode(input)
  if (!parsed) {
    return input.trim().toUpperCase().replace(/\s+/g, ' ')
  }
  return `${parsed.dept} ${parsed.num}`
}

export function splitCourseCode(code: string) {
  const parsed = parseCourseCode(code)
  if (!parsed) {
    return { dept: '', num: '' }
  }
  return parsed
}

export function isValidCourseCode(input: string) {
  return parseCourseCode(input) !== null
}
