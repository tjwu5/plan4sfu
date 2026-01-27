type ProgressSummaryProps = {
  completed: number
  total: number
  percent: number
}

export default function ProgressSummary({
  completed,
  total,
  percent,
}: ProgressSummaryProps) {
  return (
    <div className="card stack">
      <h3>Degree Progress</h3>
      <div className="stack">
        <span className="muted">
          {completed} of {total} requirements completed
        </span>
        <div className="progress-bar" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  )
}
