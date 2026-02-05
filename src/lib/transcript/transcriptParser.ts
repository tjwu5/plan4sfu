import type { CompletedCourse, ParsedTranscript, Profile } from '../../types'
import { normalizeCourseCode } from '../courses/courseCode'

const TERM_PATTERN =
  /^(20\d{2})\s+(Spring|Summer|Fall|Winter|Intersession)/i
const TERM_PATTERN_ALT =
  /^(Spring|Summer|Fall|Winter|Intersession)\s+(20\d{2})/i

const GRADE_PATTERN = /^(?:[A-F][+-]?|P|CR|W|WD|N|F|IP|AU|INC|-)$/
const NUMBER_PATTERN = /^\d+(?:\.\d+)?$/

const IGNORED_LINE_PATTERNS = [
  /student number/i,
  /page\s+\d+/i,
  /gpa/i,
  /total/i,
  /summary/i,
  /units\s+attempted/i,
  /units\s+completed/i,
  /academic\s+standing/i,
]

const cleanLine = (line: string) => line.replace(/\s+/g, ' ').trim()

const isIgnoredLine = (line: string) =>
  IGNORED_LINE_PATTERNS.some((pattern) => pattern.test(line))

const normalizeTerm = (line: string) => {
  const match = line.match(TERM_PATTERN)
  if (match) {
    return `${match[1]} ${match[2]}`
  }
  const altMatch = line.match(TERM_PATTERN_ALT)
  if (altMatch) {
    return `${altMatch[2]} ${altMatch[1]}`
  }
  return null
}

const isGradeToken = (token: string) => GRADE_PATTERN.test(token)

const parseUnits = (token: string) => {
  const value = Number.parseFloat(token)
  return Number.isNaN(value) ? 0 : value
}

const parseCourseLine = (line: string, term: string | null) => {
  const match = line.match(/^([A-Z]{2,4})\s*([0-9]{2,3}[A-Z]?)\s+(.+)$/)
  if (!match) return null

  const subject = match[1].toUpperCase()
  const number = match[2].toUpperCase()
  const remainder = match[3]
  const parts = remainder.split(/\s+/)
  if (parts.length < 3) return null

  let gradeToken: string | null = null
  let unitsAttempted = 0
  let unitsCompleted = 0

  if (isGradeToken(parts[parts.length - 1])) {
    gradeToken = parts.pop() ?? null
  }

  const numericTokens = parts.filter((part) => NUMBER_PATTERN.test(part))
  if (numericTokens.length >= 2) {
    unitsAttempted = parseUnits(numericTokens[numericTokens.length - 2])
    unitsCompleted = parseUnits(numericTokens[numericTokens.length - 1])
  }

  let titleTokens = parts.filter((part) => !NUMBER_PATTERN.test(part))
  if (numericTokens.length >= 2) {
    const lastNumericIndex = parts.lastIndexOf(
      numericTokens[numericTokens.length - 1],
    )
    titleTokens = parts.slice(0, lastNumericIndex - 1)
  }

  const title = titleTokens.join(' ').trim()

  let grade: string | null = gradeToken
  let status: string | null = null

  if (!gradeToken || gradeToken === '-' || gradeToken === 'IP') {
    grade = null
    status = 'in_progress'
  } else if (gradeToken === 'W' || gradeToken === 'WD') {
    grade = null
    status = 'withdrawn'
  }

  const course: CompletedCourse = {
    term: term ?? 'Unknown Term',
    subject,
    number,
    course: normalizeCourseCode(`${subject} ${number}`),
    title: title || 'Untitled',
    unitsAttempted,
    unitsCompleted,
    grade,
    status,
  }

  return course
}

const extractStudentName = (lines: string[]) => {
  for (const line of lines) {
    const nameMatch =
      line.match(/student name\s*[:-]\s*(.+)$/i) ??
      line.match(/^name\s*[:-]\s*(.+)$/i)
    if (nameMatch) {
      return nameMatch[1].trim()
    }
  }

  const topBlock = lines.slice(0, 15).join(' ')
  const fallbackMatch = topBlock.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/,
  )
  return fallbackMatch ? fallbackMatch[1].trim() : null
}

const extractProgramInfo = (lines: string[]) => {
  const text = lines.join(' ')
  const facultyMatch = text.match(/Faculty of\s+([A-Za-z &]+)/i)
  const majorMatch = text.match(/Major in\s+([A-Za-z &]+)/i)
  const programMatch =
    text.match(/Program:\s*([A-Za-z &]+)/i) ?? majorMatch

  return {
    faculty: facultyMatch ? facultyMatch[1].trim() : null,
    major: majorMatch ? majorMatch[1].trim() : null,
    program: programMatch ? programMatch[1].trim() : null,
  }
}

export function parseTranscriptText(text: string): ParsedTranscript {
  const rawLines = text.split(/\r?\n/)
  const lines = rawLines.map(cleanLine).filter(Boolean)
  const profileInfo = extractProgramInfo(lines)
  const displayName = extractStudentName(lines)

  const profile: Profile = {
    displayName: displayName || null,
    program: profileInfo.program ?? null,
    faculty: profileInfo.faculty ?? null,
    major: profileInfo.major ?? null,
  }

  let currentTerm: string | null = null
  const courses: CompletedCourse[] = []

  for (const line of lines) {
    if (isIgnoredLine(line)) continue

    const term = normalizeTerm(line)
    if (term) {
      currentTerm = term
      continue
    }

    const course = parseCourseLine(line, currentTerm)
    if (course) {
      courses.push(course)
    }
  }

  return { profile, courses }
}
