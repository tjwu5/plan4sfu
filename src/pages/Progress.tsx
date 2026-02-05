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
import { evaluateCSRequirements } from '../lib/degree/csRequirementsEngine'
import { getEligibilityReport } from '../lib/eligibility/eligibilityEngine'
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
  const eligibilityReport = getEligibilityReport(
    profile,
    courses,
    loadPrereqRules(),
  )
  const csReport =
    selectedPlanId && selectedPlanId.includes('cmpt')
      ? evaluateCSRequirements({
          completedCourses: courses.map((course) => course.course),
        })
      : null

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
          <EligibleCourses report={eligibilityReport} />
          {csReport && (
            <div className="card stack">
              <h3>Concentrations</h3>
              <ul className="course-list">
                {csReport.concentrations.map((area) => (
                  <li key={area.area}>
                    <span className="course-code">{area.area}</span>
                    <span className="muted">
                      {area.isSatisfied
                        ? 'Satisfied'
                        : `Missing ${area.missingCoursesCount} course(s), ${area.missing400Count} 400-level`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
