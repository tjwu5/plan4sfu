import type { CompletedCourse } from '../types'
import { useUserData } from '../state/UserDataContext'

export function useCompletedCourses() {
  const { userData, setUserData } = useUserData()

  const setCourses = (courses: CompletedCourse[]) => {
    setUserData((prev) => ({ ...prev, courses }))
  }

  return [userData.courses, setCourses] as const
}
