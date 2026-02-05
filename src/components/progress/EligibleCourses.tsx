type EligibilityReport = {
  eligible: string[]
  ineligible: Array<{
    course: string
    missingPrereqs: string[]
    reasonText: string
    prereqRaw?: string
  }>
}

type EligibleCoursesProps = {
  report: EligibilityReport
}

export default function EligibleCourses({ report }: EligibleCoursesProps) {
  const { eligible, ineligible } = report
  return (
    <div className="card stack">
      <h3>Eligible Courses</h3>
      {eligible.length === 0 ? (
        <p className="muted">No eligible courses found yet.</p>
      ) : (
        <ul className="course-list">
          {eligible.map((course) => (
            <li key={course} className="eligible-row">
              <span className="course-code">{course}</span>
              <span className="muted">Ready to enroll</span>
            </li>
          ))}
        </ul>
      )}
      {ineligible.length > 0 && (
        <>
          <h4>Missing Prerequisites</h4>
          <ul className="course-list">
            {ineligible.map((entry) => (
              <li key={entry.course}>
                <details>
                  <summary className="eligible-row">
                    <span className="course-code">{entry.course}</span>
                    <span className="muted">Tap to view missing</span>
                  </summary>
                  <div className="course-meta">
                    <div>{entry.reasonText}</div>
                    {entry.missingPrereqs.length > 0 && (
                      <div className="muted">
                        {entry.missingPrereqs.join(', ')}
                      </div>
                    )}
                    {entry.prereqRaw && (
                      <div className="muted">{entry.prereqRaw}</div>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
