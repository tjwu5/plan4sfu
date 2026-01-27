import { usePreferences } from '../hooks/usePreferences'

export default function Settings() {
  const [preferences, setPreferences] = usePreferences()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Customize your planning preferences.</p>
        </div>
      </div>
      <div className="card stack">
        <label className="toggle">
          <input
            type="checkbox"
            checked={preferences.avoid830}
            onChange={(event) =>
              setPreferences({ ...preferences, avoid830: event.target.checked })
            }
          />
          Avoid 8:30 AM starts
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={preferences.lockEdits}
            onChange={(event) =>
              setPreferences({ ...preferences, lockEdits: event.target.checked })
            }
          />
          Lock transcript edits
        </label>
      </div>
    </div>
  )
}
