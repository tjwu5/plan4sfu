import { useUserData } from '../state/UserDataContext'

export function useDegreePlan() {
  const { userData, setUserData } = useUserData()

  const setSelectedDegreePlanId = (selectedDegreePlanId: string | null) => {
    setUserData((prev) => ({ ...prev, selectedDegreePlanId }))
  }

  return [userData.selectedDegreePlanId, setSelectedDegreePlanId] as const
}
