import type { Preferences } from '../types'
import { useUserData } from '../state/UserDataContext'

export function usePreferences() {
  const { userData, setUserData } = useUserData()

  const setPreferences = (preferences: Preferences) => {
    setUserData((prev) => ({ ...prev, preferences }))
  }

  return [userData.preferences, setPreferences] as const
}
