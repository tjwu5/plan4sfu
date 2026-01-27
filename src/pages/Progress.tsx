import { useMemo } from 'react'
import ProgressSummary from '../components/progress/ProgressSummary'
import RemainingRequirements from '../components/progress/RemainingRequirements'
import EligibleCourses from '../components/progress/EligibleCourses'
import { useCompletedCourses } from '../hooks/useCompletedCourses'
import { useDegreePlan } from '../hooks/useDegreePlan'
import { useProfile } from '../hooks/useProfile'
import { loadDegreePlans } from '../lib/degree/degreePlanLoader'
import {
  getRemainingRequirements,
  getRequirementStatuses,
  summarizeProgress,
} from '../lib/degree/degreeProgress'
import { getEligibleCourses } from '../lib/eligibility/eligibilityEngine'
import { loadPrereqRules } from '../lib/eligibility/prereqRulesLoader'

export default function Progress() {
  const [courses] = useCompletedCourses()
  const [profile] = useProfile()
  const [selectedPlanId] = useDegreePlan()

  const selectedPlan = useMemo(
    () =>
      loadDegreePlans().find((plan) => plan.id === selectedPlanId) ?? null,
    [selectedPlanId],
  )

  const statuses = selectedPlan
    ? getRequirementStatuses(selectedPlan, courses)
    : []
  const summary = summarizeProgress(statuses)
  const remaining = getRemainingRequirements(statuses)
  const eligible = getEligibleCourses(loadPrereqRules(), courses)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            {profile.displayName
              ? `hi there, ${profile.displayName}, here are your suggested courses`
              : 'Here are your suggested courses'}
          </h1>
          <p className="muted">
            Keep your transcript up to date to see accurate progress.
          </p>
        </div>
      </div>

      {!selectedPlan ? (
        <div className="card">
          <p className="muted">Select a degree plan in Setup to begin.</p>
        </div>
      ) : (
        <div className="grid">
          <ProgressSummary
            completed={summary.completed}
            total={summary.total}
            percent={summary.percent}
          />
          <RemainingRequirements remaining={remaining} />
          <EligibleCourses courses={eligible} />
        </div>
      )}
    </div>
  )
}
