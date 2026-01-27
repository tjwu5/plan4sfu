import type { Preferences } from '../../types'
import type { OutlinesListItem } from '../../types/sfuOutlines'

type Term = Preferences['targetTerm']

type SearchPanelProps = {
  term: Term
  years: OutlinesListItem[]
  terms: OutlinesListItem[]
  departments: OutlinesListItem[]
  selectedDept: string
  courseNumber: string
  loading: boolean
  error: string | null
  onTermChange: (term: Term) => void
  onDeptChange: (dept: string) => void
  onCourseNumberChange: (value: string) => void
  onSearch: () => void
}

export default function SearchPanel({
  term,
  years,
  terms,
  departments,
  selectedDept,
  courseNumber,
  loading,
  error,
  onTermChange,
  onDeptChange,
  onCourseNumberChange,
  onSearch,
}: SearchPanelProps) {
  return (
    <div className="card stack">
      <h3>Search Courses</h3>
      <div className="stack">
        <label className="term-selector">
          Year
          <select
            value={term.year}
            onChange={(event) =>
              onTermChange({ ...term, year: Number(event.target.value) })
            }
          >
            {years.map((year) => (
              <option key={year.value} value={Number(year.value)}>
                {year.text}
              </option>
            ))}
          </select>
        </label>
        <label className="term-selector">
          Term
          <select
            value={term.term}
            onChange={(event) =>
              onTermChange({ ...term, term: event.target.value as Term['term'] })
            }
          >
            {terms.map((termOption) => (
              <option key={termOption.value} value={termOption.value}>
                {termOption.text}
              </option>
            ))}
          </select>
        </label>
        <label>
          Department
          <select
            value={selectedDept}
            onChange={(event) => onDeptChange(event.target.value)}
          >
            <option value="">Select department</option>
            {departments.map((dept) => (
              <option key={dept.value} value={dept.value}>
                {dept.text}
              </option>
            ))}
          </select>
        </label>
        <label>
          Course number
          <input
            value={courseNumber}
            onChange={(event) => onCourseNumberChange(event.target.value)}
            placeholder="e.g. 225"
          />
        </label>
      </div>
      <button onClick={onSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      {error && <span className="status status-error">{error}</span>}
    </div>
  )
}
