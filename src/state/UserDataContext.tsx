import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  loadUserData,
  saveUserData,
  type UserData,
} from '../lib/state/userStorage'

type UserDataContextValue = {
  userData: UserData
  setUserData: React.Dispatch<React.SetStateAction<UserData>>
}

const UserDataContext = createContext<UserDataContextValue | null>(null)

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData>(() => loadUserData())

  useEffect(() => {
    saveUserData(userData)
  }, [userData])

  const value = useMemo(() => ({ userData, setUserData }), [userData])

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserData() {
  const context = useContext(UserDataContext)
  if (!context) {
    throw new Error('useUserData must be used within UserDataProvider')
  }
  return context
}
