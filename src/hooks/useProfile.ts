import type { Profile } from '../types'
import { useUserData } from '../state/UserDataContext'

export function useProfile() {
  const { userData, setUserData } = useUserData()

  const setProfile = (profile: Profile) => {
    setUserData((prev) => ({ ...prev, profile }))
  }

  return [userData.profile, setProfile] as const
}
