type ConcentrationCardProps = {
  area: string
  completedCount: number
  completed400Count: number
  isSatisfied: boolean
  countsSoFar: string[]
  blockers: Array<{ course: string; blocksCount: number }>
  nextPicks: Array<{ course: string; reason: string }>
  onCourseClick?: (course: string) => void
}

export default function ConcentrationCard({
  area,
  completedCount,
  completed400Count,
  isSatisfied,
  countsSoFar,
  blockers,
  nextPicks,
  onCourseClick,
}: ConcentrationCardProps) {
  return (
    <div className="card stack">
      <div className="plan-meta">
        <h3>{area}</h3>
        {isSatisfied && <span className="badge badge-ok">Satisfied</span>}
      </div>
      <div className="course-meta">
        {completedCount}/4 courses · {completed400Count}/2 400-level
      </div>

      <div className="drawer-section">
        <strong>Counts so far</strong>
        {countsSoFar.length === 0 ? (
          <span className="muted">None yet.</span>
        ) : (
          <div className="chip-list">
            {countsSoFar.map((course) => (
              <button
                key={course}
                className="chip"
                onClick={() => onCourseClick?.(course)}
              >
                {course}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="drawer-section">
        <strong>Top blockers</strong>
        {blockers.length === 0 ? (
          <span className="muted">No blockers identified.</span>
        ) : (
          <ul className="course-list">
            {blockers.map((blocker) => (
              <li key={blocker.course}>
                <button
                  className="course-code"
                  onClick={() => onCourseClick?.(blocker.course)}
                >
                  {blocker.course}
                </button>
                <span className="course-meta">
                  Blocks {blocker.blocksCount} course(s)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="drawer-section">
        <strong>Next best picks</strong>
        {nextPicks.length === 0 ? (
          <span className="muted">No eligible courses yet.</span>
        ) : (
          <ul className="course-list">
            {nextPicks.map((pick) => (
              <li key={pick.course}>
                <button
                  className="course-code"
                  onClick={() => onCourseClick?.(pick.course)}
                >
                  {pick.course}
                </button>
                <span className="course-meta">{pick.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
