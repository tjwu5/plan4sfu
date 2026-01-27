import { useEffect, useMemo, useState } from 'react'
import SearchPanel from '../components/plan/SearchPanel'
import CartPanel from '../components/plan/CartPanel'
import WeeklyGrid from '../components/plan/WeeklyGrid'
import DebugPanel from '../components/plan/DebugPanel'
import { usePreferences } from '../hooks/usePreferences'
import { normalizeSectionDetailToOfferings } from '../lib/offerings'
import { findConflicts } from '../lib/scheduleLogic'
import { generateSchedules } from '../lib/scheduleGenerator'
import type { Offering, Preferences } from '../types'
import type { OutlinesListItem } from '../types/sfuOutlines'
import {
  getCourseNumbers,
  getDepartments,
  getSectionDetail,
  getSections,
  getTerms,
  getYears,
} from '../services/sfuOutlinesClient'

type Term = Preferences['targetTerm']

export default function Plan() {
  const [preferences, setPreferences] = usePreferences()
  const [term, setTerm] = useState<Term>(preferences.targetTerm)
  const [years, setYears] = useState<OutlinesListItem[]>([])
  const [terms, setTerms] = useState<OutlinesListItem[]>([])
  const [departments, setDepartments] = useState<OutlinesListItem[]>([])
  const [selectedDept, setSelectedDept] = useState('')
  const [courseNumber, setCourseNumber] = useState('')
  const [results, setResults] = useState<Offering[]>([])
  const [selected, setSelected] = useState<Offering[]>([])
  const [generated, setGenerated] = useState<Offering[][]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (
      preferences.targetTerm.year !== term.year ||
      preferences.targetTerm.term !== term.term
    ) {
      setPreferences({ ...preferences, targetTerm: term })
    }
  }, [term, preferences, setPreferences])

  useEffect(() => {
    const loadLists = async () => {
      try {
        const yearOptions = await getYears()
        setYears(yearOptions)
        if (yearOptions.length > 0) {
          const yearValue = Number(yearOptions[0].value)
          const termOptions = await getTerms(term.year || yearValue)
          setTerms(termOptions)
          const deptOptions = await getDepartments(
            term.year || yearValue,
            term.term,
          )
          setDepartments(deptOptions)
        }
      } catch (err) {
        console.error(err)
        setError('Unable to load outline data.')
      }
    }

    loadLists()
  }, [term.year, term.term])

  const handleSearch = async () => {
    if (!selectedDept || !courseNumber) {
      setError('Choose a department and course number.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const numbers = await getCourseNumbers(
        term.year,
        term.term,
        selectedDept,
      )
      const validNumbers = numbers.map((item) => item.value)
      const lookupNumber = validNumbers.includes(courseNumber)
        ? courseNumber
        : validNumbers.find((value) => value.startsWith(courseNumber))

      if (!lookupNumber) {
        setResults([])
        setError('No matching course number found.')
        return
      }

      const sections = await getSections(
        term.year,
        term.term,
        selectedDept,
        lookupNumber,
      )

      const detailResults = await Promise.all(
        sections.map(async (section) => {
          const detail = await getSectionDetail(
            term.year,
            term.term,
            selectedDept,
            lookupNumber,
            section.value,
          )
          return normalizeSectionDetailToOfferings(detail, {
            year: term.year,
            term: term.term,
            dept: selectedDept,
            number: lookupNumber,
            section: section.value,
          })
        }),
      )

      setResults(detailResults.flat())
    } catch (err) {
      console.error(err)
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (offering: Offering) => {
    setSelected((prev) => {
      if (
        prev.some(
          (item) =>
            item.courseId === offering.courseId &&
            item.section === offering.section,
        )
      ) {
        return prev
      }
      return [...prev, offering]
    })
  }

  const removeFromCart = (index: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== index))
  }

  const conflicts = useMemo(() => findConflicts(selected), [selected])

  const handleGenerate = () => {
    const courseIds = Array.from(new Set(selected.map((item) => item.courseId)))
    const offeringsByCourse = results.reduce<Record<string, Offering[]>>(
      (acc, offering) => {
        const key = offering.courseId
        if (!acc[key]) acc[key] = []
        acc[key].push(offering)
        return acc
      },
      {},
    )
    const schedules = generateSchedules(courseIds, offeringsByCourse, {
      campus: preferences.campusPreference,
      avoid830: preferences.avoid830,
    })
    setGenerated(schedules)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Schedule Builder</h1>
          <p className="muted">
            Search SFU outlines and collect sections to build schedules.
          </p>
        </div>
      </div>

      <div className="schedule-layout">
        <div className="schedule-panel">
          <SearchPanel
            term={term}
            years={years}
            terms={terms}
            departments={departments}
            selectedDept={selectedDept}
            courseNumber={courseNumber}
            loading={loading}
            error={error}
            onTermChange={setTerm}
            onDeptChange={setSelectedDept}
            onCourseNumberChange={setCourseNumber}
            onSearch={handleSearch}
          />

          <div className="card stack">
            <h3>Results</h3>
            {results.length === 0 ? (
              <p className="muted">Search to see sections.</p>
            ) : (
              <div className="results-list">
                {results.map((offering, index) => (
                  <div
                    className="result-card"
                    key={`${offering.courseId}-${offering.section}-${index}`}
                  >
                    <strong>
                      {offering.courseId} {offering.section}
                    </strong>
                    <span className="muted">
                      {offering.days.join(' ')}{' '}
                      {offering.startMinutes}-{offering.endMinutes}
                    </span>
                    <button onClick={() => addToCart(offering)}>
                      Add to cart
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="schedule-right">
          <CartPanel
            selections={selected}
            conflicts={conflicts}
            preferences={preferences}
            onRemove={removeFromCart}
            onPreferencesChange={setPreferences}
            onGenerate={handleGenerate}
          />
          <WeeklyGrid offerings={selected} />
          {generated.length > 0 && (
            <div className="card stack">
              <h3>Generated Schedules</h3>
              <div className="schedule-results">
                {generated.map((schedule, index) => (
                  <div className="schedule-card" key={`schedule-${index}`}>
                    {schedule.map((offering) => (
                      <div key={`${offering.courseId}-${offering.section}`}>
                        {offering.courseId} {offering.section}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DebugPanel offering={results[0]} />
        </div>
      </div>
    </div>
  )
}
