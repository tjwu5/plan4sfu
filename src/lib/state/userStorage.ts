import type { CompletedCourse, Preferences, Profile } from '../../types'
import {
  normalizeCourseCode,
  splitCourseCode,
} from '../courses/courseCode'

export type UserData = {
  profile: Profile
  courses: CompletedCourse[]
  selectedDegreePlanId: string | null
  preferences: Preferences
}

export const STORAGE_KEY = 'plan4sfu.userdata.v1'
const LEGACY_TRANSCRIPT_KEY = 'plan4sfu.transcript.v1'

export const defaultPreferences: Preferences = {
  lockEdits: false,
  campusPreference: 'Any',
  avoid830: false,
  targetTerm: {
    year: new Date().getFullYear(),
    term: 'fall',
  },
}

const defaultProfile: Profile = {
  displayName: null,
  program: null,
  faculty: null,
  major: null,
}

export const defaultUserData: UserData = {
  profile: defaultProfile,
  courses: [],
  selectedDegreePlanId: null,
  preferences: defaultPreferences,
}

const normalizeStoredCourses = (courses: CompletedCourse[]) =>
  courses.map((course) => {
    const normalizedCourse = normalizeCourseCode(course.course || '')
    const split = splitCourseCode(normalizedCourse)
    return {
      ...course,
      subject: split.dept || course.subject?.trim().toUpperCase(),
      number: split.num || course.number?.trim().toUpperCase(),
      course: normalizedCourse,
    }
  })

export function loadUserData(): UserData {
  if (typeof localStorage === 'undefined') {
    return defaultUserData
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<UserData>
      return {
        ...defaultUserData,
        ...parsed,
        profile: {
          ...defaultProfile,
          ...(parsed.profile ?? {}),
        },
        preferences: {
          ...defaultPreferences,
          ...(parsed.preferences ?? {}),
        },
        courses: normalizeStoredCourses(parsed.courses ?? []),
      }
    } catch {
      // fall through to legacy migration
    }
  }

  const legacy = localStorage.getItem(LEGACY_TRANSCRIPT_KEY)
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as {
        profile?: Profile
        courses?: CompletedCourse[]
      }
      return {
        ...defaultUserData,
        profile: { ...defaultProfile, ...(parsed.profile ?? {}) },
        courses: normalizeStoredCourses(parsed.courses ?? []),
      }
    } catch {
      return defaultUserData
    }
  }

  return defaultUserData
}

export function saveUserData(data: UserData) {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
