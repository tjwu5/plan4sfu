import { useEffect, useMemo, useState } from 'react'
import SearchPanel from '../components/plan/SearchPanel'
import CartPanel from '../components/plan/CartPanel'
import WeeklyGrid from '../components/plan/WeeklyGrid'
import DebugPanel from '../components/plan/DebugPanel'
import CourseDetailDrawer from '../components/course/CourseDetailDrawer'
import { usePreferences } from '../hooks/usePreferences'
import { useCompletedCourses } from '../hooks/useCompletedCourses'
import { normalizeSectionDetailToOfferings } from '../lib/offerings'
import { findConflicts } from '../lib/scheduleLogic'
import { generateSchedules } from '../lib/scheduleGenerator'
import { evaluatePlan } from '../lib/plan/planEvaluator'
import { loadPrereqRules, loadPrereqGraph } from '../lib/eligibility/prereqRulesLoader'
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
  const [completedCourses] = useCompletedCourses()
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
  const [showTimetable, setShowTimetable] = useState(false)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [drawerCourse, setDrawerCourse] = useState<{
    courseId: string
    title?: string
    dept: string
    number: string
    section: string
  } | null>(null)

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

  const planEvaluation = useMemo(() => {
    if (selected.length === 0) return null
    const graph = loadPrereqGraph()
    const rules = loadPrereqRules()
    return evaluatePlan({
      profile: {},
      completedCourses: completedCourses.map((course) => course.course),
      plan: {
        terms: [
          {
            id: `${term.year}-${term.term}`,
            label: `${term.term} ${term.year}`,
            courses: selected.map((item) => item.courseId),
          },
        ],
      },
      prereqRules: rules,
      prereqGraph: graph,
    })
  }, [completedCourses, selected, term.term, term.year])

  const exportRows = useMemo(() => {
    const termLabel = `${term.term} ${term.year}`
    const uniqueCourses = Array.from(
      new Set(selected.map((item) => item.courseId)),
    )
    return uniqueCourses.map((course) => ({
      term: termLabel,
      course,
    }))
  }, [selected, term.term, term.year])

  const exportText = useMemo(() => {
    if (exportRows.length === 0) return ''
    const lines = exportRows.map((row) => `${row.term}: ${row.course}`)
    return lines.join('\n')
  }, [exportRows])

  const exportCsv = useMemo(() => {
    if (exportRows.length === 0) return ''
    const header = 'Term,Course'
    const lines = exportRows.map((row) => `${row.term},${row.course}`)
    return [header, ...lines].join('\n')
  }, [exportRows])

  const handleCopy = async () => {
    if (!exportText) return
    try {
      await navigator.clipboard.writeText(exportText)
      setCopyStatus('Copied to clipboard.')
    } catch (err) {
      console.error(err)
      setCopyStatus('Unable to copy. Please try again.')
    }
    window.setTimeout(() => setCopyStatus(null), 2000)
  }

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

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
          <h1>Plan Evaluation</h1>
          <p className="muted">
            Build a term plan and get decision support for feasibility.
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
            onCourseClick={(offering) =>
              setDrawerCourse({
                courseId: offering.courseId,
                title: offering.title,
                dept: offering.dept,
                number: offering.number,
                section: offering.section,
              })
            }
          />
          <div className="card stack">
            <div className="plan-meta">
              <h3>Optional timetable view</h3>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showTimetable}
                  onChange={(event) => setShowTimetable(event.target.checked)}
                />
                Show timetable
              </label>
            </div>
            {showTimetable ? (
              <WeeklyGrid offerings={selected} />
            ) : (
              <p className="muted">Toggle on to preview a timetable layout.</p>
            )}
          </div>
          {planEvaluation && (
            <div className="card stack">
              <h3>Plan Evaluation</h3>
              {planEvaluation.termReports.map((report) => (
                <div key={report.termId} className="stack">
                  <strong>{report.termId}</strong>
                  {report.infeasible.length > 0 ? (
                    <div className="status status-error">
                      {report.infeasible.map((item) => item.course).join(', ')}
                      {' '}missing prereqs
                    </div>
                  ) : (
                    <div className="status status-ok">No prereq issues.</div>
                  )}
                  <ul className="course-list">
                    {report.explanations.slice(0, 4).map((line) => (
                      <li key={line} className="muted">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="card stack">
            <h3>Export Plan</h3>
            {exportRows.length === 0 ? (
              <p className="muted">Add courses to export your plan.</p>
            ) : (
              <>
                <div className="table-actions">
                  <button
                    onClick={() =>
                      handleDownload(
                        exportText,
                        `plan-${term.term}-${term.year}.txt`,
                      )
                    }
                  >
                    Download text
                  </button>
                  <button
                    onClick={() =>
                      handleDownload(
                        exportCsv,
                        `plan-${term.term}-${term.year}.csv`,
                      )
                    }
                  >
                    Download CSV
                  </button>
                  <button onClick={handleCopy}>Copy to clipboard</button>
                </div>
                {copyStatus && <span className="status">{copyStatus}</span>}
              </>
            )}
          </div>
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
      <CourseDetailDrawer
        open={drawerCourse !== null}
        onClose={() => setDrawerCourse(null)}
        courseCode={drawerCourse?.courseId ?? null}
        completedCourses={completedCourses.map((course) => course.course)}
        plannedCourses={selected.map((item) => item.courseId)}
        initialTitle={drawerCourse?.title}
        outlineContext={
          drawerCourse
            ? {
                year: term.year,
                term: term.term,
                dept: drawerCourse.dept,
                number: drawerCourse.number,
                section: drawerCourse.section,
              }
            : undefined
        }
      />
    </div>
  )
}
