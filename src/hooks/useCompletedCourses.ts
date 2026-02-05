import type { CompletedCourse } from '../types'
import { useUserData } from '../state/UserDataContext'
import {
  normalizeCourseCode,
  splitCourseCode,
} from '../lib/courses/courseCode'

const normalizeCompletedCourse = (course: CompletedCourse): CompletedCourse => {
  const normalizedCourse = normalizeCourseCode(course.course || '')
  const split = splitCourseCode(normalizedCourse)
  return {
    ...course,
    subject: split.dept || course.subject.trim().toUpperCase(),
    number: split.num || course.number.trim().toUpperCase(),
    course: normalizedCourse,
  }
}

export function useCompletedCourses() {
  const { userData, setUserData } = useUserData()

  const setCourses = (courses: CompletedCourse[]) => {
    setUserData((prev) => ({
      ...prev,
      courses: courses.map(normalizeCompletedCourse),
    }))
  }

  return [userData.courses, setCourses] as const
}
