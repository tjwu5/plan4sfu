import type { RequirementStatus } from '../../lib/degree/degreeProgress'

type RemainingRequirementsProps = {
  remaining: RequirementStatus[]
}

export default function RemainingRequirements({
  remaining,
}: RemainingRequirementsProps) {
  return (
    <div className="card stack">
      <h3>Remaining Requirements</h3>
      {remaining.length === 0 ? (
        <p className="muted">All requirements satisfied.</p>
      ) : (
        <ul className="course-list">
          {remaining.map((requirement) => (
            <li key={requirement.id}>
              <span className="course-code">{requirement.courseId}</span>
              {requirement.title && (
                <span className="course-meta">{requirement.title}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
