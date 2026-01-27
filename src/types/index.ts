export type CompletedCourse = {
  term: string
  subject: string
  number: string
  course: string
  title: string
  unitsAttempted: number
  unitsCompleted: number
  grade: string | null
  status: string | null
}

export type Profile = {
  displayName: string | null
  program?: string | null
  faculty?: string | null
  major?: string | null
}

export type ParsedTranscript = {
  profile: Profile
  courses: CompletedCourse[]
}

export type Requirement = {
  id: string
  courseId: string
  title?: string
}

export type DegreePlan = {
  id: string
  name: string
  faculty?: string
  major?: string
  requiredCourses: Requirement[]
}

export type Preferences = {
  lockEdits: boolean
  campusPreference: 'Any' | 'Burnaby' | 'Surrey' | 'Vancouver'
  avoid830: boolean
  targetTerm: { year: number; term: 'spring' | 'summer' | 'fall' }
}

export type Offering = {
  courseId: string
  dept: string
  number: string
  title?: string
  section: string
  campus?: string
  days: string[]
  startMinutes: number
  endMinutes: number
  instructors: string[]
  term: { year: number; term: string }
  raw: unknown
}
