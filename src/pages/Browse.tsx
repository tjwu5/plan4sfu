import { useMemo, useState } from 'react'
import CourseDetailDrawer from '../components/course/CourseDetailDrawer'
import { useCompletedCourses } from '../hooks/useCompletedCourses'
import { usePreferences } from '../hooks/usePreferences'
import { loadPrereqRules } from '../lib/eligibility/prereqRulesLoader'
import { normalizeCourseCode, splitCourseCode } from '../lib/courses/courseCode'

export default function Browse() {
  const [preferences] = usePreferences()
  const [completedCourses] = useCompletedCourses()
  const [drawerCourse, setDrawerCourse] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const courseList = useMemo(() => {
    const rules = loadPrereqRules()
    const unique = Array.from(
      new Set(rules.map((rule) => normalizeCourseCode(rule.courseId))),
    )
    const normalizedFilter = filter.trim().toUpperCase()
    return unique
      .filter((course) =>
        normalizedFilter
          ? course.toUpperCase().includes(normalizedFilter)
          : true,
      )
      .sort((a, b) => a.localeCompare(b, 'en-US'))
  }, [filter])

  const split = drawerCourse ? splitCourseCode(drawerCourse) : null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Browse</h1>
          <p className="muted">Search a course to view prerequisites.</p>
        </div>
      </div>
      <div className="card">
        <div className="stack">
          <label>
            Search courses
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="CMPT 310"
            />
          </label>
          <div className="course-tiles">
            {courseList.slice(0, 60).map((course) => (
              <button
                key={course}
                className="course-tile"
                onClick={() => setDrawerCourse(course)}
              >
                <span className="course-code">{course}</span>
              </button>
            ))}
          </div>
          {courseList.length > 60 && (
            <span className="muted">Showing first 60 results.</span>
          )}
        </div>
      </div>
      <CourseDetailDrawer
        open={drawerCourse !== null}
        onClose={() => setDrawerCourse(null)}
        courseCode={drawerCourse}
        completedCourses={completedCourses.map((course) => course.course)}
        outlineContext={
          split
            ? {
                year: preferences.targetTerm.year,
                term: preferences.targetTerm.term,
                dept: split.dept,
                number: split.num,
              }
            : undefined
        }
      />
    </div>
  )
}
