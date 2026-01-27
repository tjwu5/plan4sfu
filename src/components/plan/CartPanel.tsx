import type { Offering, Preferences } from '../../types'

type CartPanelProps = {
  selections: Offering[]
  conflicts: { message: string }[]
  preferences: Preferences
  onRemove: (index: number) => void
  onPreferencesChange: (prefs: Preferences) => void
  onGenerate: () => void
}

export default function CartPanel({
  selections,
  conflicts,
  preferences,
  onRemove,
  onPreferencesChange,
  onGenerate,
}: CartPanelProps) {
  return (
    <div className="card stack">
      <h3>Selected Sections</h3>
      {selections.length === 0 ? (
        <p className="muted">No sections selected.</p>
      ) : (
        <ul className="course-list">
          {selections.map((offering, index) => (
            <li key={`${offering.courseId}-${offering.section}-${index}`}>
              <strong>
                {offering.courseId} {offering.section}
              </strong>
              <span className="course-meta">
                {offering.days.join(' ')} {offering.startMinutes}-
                {offering.endMinutes}
              </span>
              <button onClick={() => onRemove(index)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      <div className="stack">
        <label className="filter-row">
          Campus preference
          <select
            value={preferences.campusPreference}
            onChange={(event) =>
              onPreferencesChange({
                ...preferences,
                campusPreference: event.target.value as Preferences['campusPreference'],
              })
            }
          >
            <option value="Any">Any</option>
            <option value="Burnaby">Burnaby</option>
            <option value="Surrey">Surrey</option>
            <option value="Vancouver">Vancouver</option>
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={preferences.avoid830}
            onChange={(event) =>
              onPreferencesChange({
                ...preferences,
                avoid830: event.target.checked,
              })
            }
          />
          Avoid 8:30 AM starts
        </label>
      </div>

      {conflicts.length > 0 && (
        <div className="conflict-list">
          <strong>Conflicts</strong>
          <ul className="course-list">
            {conflicts.map((conflict, index) => (
              <li key={index}>{conflict.message}</li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onGenerate}>Generate schedules</button>
    </div>
  )
}
