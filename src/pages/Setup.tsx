import { useEffect, useMemo, useState } from 'react'
import TranscriptUpload from '../components/setup/TranscriptUpload'
import CompletedCoursesTable from '../components/setup/CompletedCoursesTable'
import Mascot from '../components/Mascot'
import { useDegreePlan } from '../hooks/useDegreePlan'
import { useProfile } from '../hooks/useProfile'
import { useCompletedCourses } from '../hooks/useCompletedCourses'
import { usePreferences } from '../hooks/usePreferences'
import { loadDegreePlans } from '../lib/degree/degreePlanLoader'
import type { DegreePlan } from '../types'

export default function Setup() {
  const [plans, setPlans] = useState<DegreePlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useDegreePlan()
  const [profile, setProfile] = useProfile()
  const [courses, setCourses] = useCompletedCourses()
  const [preferences, setPreferences] = usePreferences()

  useEffect(() => {
    setPlans(loadDegreePlans())
  }, [])

  useEffect(() => {
    if (!selectedPlanId && plans.length === 1) {
      setSelectedPlanId(plans[0].id)
    }
  }, [plans, selectedPlanId, setSelectedPlanId])

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )

  const clearTranscript = () => {
    setCourses([])
    setProfile({
      ...profile,
      displayName: null,
      program: null,
      faculty: null,
      major: null,
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Setup</h1>
          <p className="muted">Upload your transcript and pick a plan.</p>
        </div>
      </div>

      <div className="grid">
        <div className="stack">
          <TranscriptUpload />
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.lockEdits}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  lockEdits: event.target.checked,
                })
              }
            />
            Lock edits (avoid re-parsing overwriting changes)
          </label>
        </div>

        <div className="card stack">
          <h3>Program</h3>
          {profile.program || profile.faculty || profile.major ? (
            <div className="stack">
              {profile.program && <div>{profile.program}</div>}
              {profile.major && <div>{profile.major}</div>}
              {profile.faculty && <div className="muted">{profile.faculty}</div>}
            </div>
          ) : (
            <p className="muted">Upload a transcript to extract your program.</p>
          )}
        </div>
      </div>

      <div className="grid">
        <div className="card stack">
          <h3>Degree Plan</h3>
          <label>
            Select a plan
            <select
              value={selectedPlanId ?? ''}
              onChange={(event) =>
                setSelectedPlanId(event.target.value || null)
              }
            >
              <option value="">Choose a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>
          {selectedPlan && (
            <p className="muted">
              {selectedPlan.requiredCourses.length} required courses.
            </p>
          )}
        </div>

        <div className="card stack upload-mascot-wrap">
          <h3>Reset Transcript</h3>
          <p className="muted">
            Clear courses and profile data to start over.
          </p>
          <button onClick={clearTranscript}>Clear transcript data</button>
          {courses.length === 0 && (
            <div className="upload-mascot">
              <Mascot variant="pointing" size={110} />
            </div>
          )}
        </div>
      </div>

      <CompletedCoursesTable />
    </div>
  )
}
