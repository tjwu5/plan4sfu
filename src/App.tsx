import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import BinderLayout from './components/binder/BinderLayout'
import { useDegreePlan } from './hooks/useDegreePlan'
import Browse from './pages/Browse'
import Landing from './pages/Landing'
import Plan from './pages/Plan'
import Progress from './pages/Progress'
import Settings from './pages/Settings'
import Setup from './pages/Setup'

function RequireSetup({ children }: { children: ReactNode }) {
  const [selectedPlanId] = useDegreePlan()
  if (!selectedPlanId) {
    return <Navigate to="/setup" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<BinderLayout />}>
        <Route path="/setup" element={<Setup />} />
        <Route
          path="/progress"
          element={
            <RequireSetup>
              <Progress />
            </RequireSetup>
          }
        />
        <Route
          path="/plan"
          element={
            <RequireSetup>
              <Plan />
            </RequireSetup>
          }
        />
        <Route
          path="/browse"
          element={
            <RequireSetup>
              <Browse />
            </RequireSetup>
          }
        />
        <Route path="/explore" element={<Navigate to="/browse" replace />} />
        <Route
          path="/settings"
          element={
            <RequireSetup>
              <Settings />
            </RequireSetup>
          }
        />
        <Route path="*" element={<Navigate to="/progress" replace />} />
      </Route>
    </Routes>
  )
}

