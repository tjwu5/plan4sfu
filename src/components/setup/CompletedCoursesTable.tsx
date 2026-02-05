import { useEffect, useState } from 'react'
import type { CompletedCourse } from '../../types'
import { useCompletedCourses } from '../../hooks/useCompletedCourses'
import {
  normalizeCourseCode,
  splitCourseCode,
} from '../../lib/courses/courseCode'

type CourseModalProps = {
  course: CompletedCourse
  onSave: (course: CompletedCourse) => void
  onDelete: () => void
  onClose: () => void
}

const toNumber = (value: string) => {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const makeEmptyCourse = (): CompletedCourse => ({
  term: '',
  subject: '',
  number: '',
  course: '',
  title: '',
  unitsAttempted: 0,
  unitsCompleted: 0,
  grade: null,
  status: null,
})

function CourseModal({ course, onSave, onDelete, onClose }: CourseModalProps) {
  const [draft, setDraft] = useState<CompletedCourse>(course)

  const updateField = (field: keyof CompletedCourse, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = () => {
    const normalizedCourse = normalizeCourseCode(
      `${draft.subject} ${draft.number}`,
    )
    const split = splitCourseCode(normalizedCourse)
    const subject = split.dept || draft.subject.trim().toUpperCase()
    const number = split.num || draft.number.trim().toUpperCase()
    const normalized = {
      ...draft,
      subject,
      number,
      course: normalizedCourse,
      title: draft.title.trim() || 'Untitled',
      unitsAttempted: toNumber(String(draft.unitsAttempted)),
      unitsCompleted: toNumber(String(draft.unitsCompleted)),
      grade: draft.grade?.trim() || null,
      status: draft.status?.trim() || null,
    }
    onSave(normalized)
  }

  return (
    <div className="course-modal" role="dialog" aria-modal="true">
      <button
        className="course-modal-backdrop"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="course-modal-card">
        <div className="course-modal-header">
          <div>
            <h3>
              {draft.subject && draft.number
                ? `${draft.subject} ${draft.number}`
                : 'New Course'}
            </h3>
            <p className="muted">Edit course details and save changes.</p>
          </div>
          <div className="course-actions">
            <button onClick={handleSave}>Save</button>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="course-edit-grid">
          <label>
            Term
            <input
              value={draft.term}
              onChange={(event) => updateField('term', event.target.value)}
            />
          </label>
          <label>
            Subject
            <input
              value={draft.subject}
              onChange={(event) => updateField('subject', event.target.value)}
            />
          </label>
          <label>
            Number
            <input
              value={draft.number}
              onChange={(event) => updateField('number', event.target.value)}
            />
          </label>
          <label>
            Title
            <input
              value={draft.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>
          <label>
            Units Attempted
            <input
              value={draft.unitsAttempted}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  unitsAttempted: toNumber(event.target.value),
                }))
              }
            />
          </label>
          <label>
            Units Completed
            <input
              value={draft.unitsCompleted}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  unitsCompleted: toNumber(event.target.value),
                }))
              }
            />
          </label>
          <label>
            Grade
            <input
              value={draft.grade ?? ''}
              onChange={(event) => updateField('grade', event.target.value)}
            />
          </label>
          <label>
            Status
            <input
              value={draft.status ?? ''}
              onChange={(event) => updateField('status', event.target.value)}
            />
          </label>
        </div>
        <div className="course-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function CompletedCoursesTable() {
  const [courses, setCourses] = useCompletedCourses()
  const [draftCourses, setDraftCourses] = useState<CompletedCourse[]>(courses)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!isDirty) {
      setDraftCourses(courses)
    }
  }, [courses, isDirty])

  const activeCourse =
    activeIndex === null
      ? null
      : draftCourses[activeIndex] ?? makeEmptyCourse()

  const updateCourseAt = (index: number, updated: CompletedCourse) => {
    setDraftCourses((prev) => {
      const copy = [...prev]
      copy[index] = updated
      return copy
    })
    setIsDirty(true)
  }

  const deleteCourseAt = (index: number) => {
    setDraftCourses((prev) => prev.filter((_, i) => i !== index))
    setIsDirty(true)
  }

  const handleAdd = () => {
    setDraftCourses((prev) => [...prev, makeEmptyCourse()])
    setActiveIndex(draftCourses.length)
    setIsDirty(true)
  }

  const handleSaveAll = () => {
    setCourses(draftCourses)
    setIsDirty(false)
  }

  return (
    <div className="card stack">
      <div className="table-header">
        <div>
          <h3>Completed Courses</h3>
          <p className="muted">
            Click a course to edit or add a new one.
          </p>
        </div>
        <div className="table-actions">
          <button onClick={handleAdd}>Add Course</button>
          <button onClick={handleSaveAll} disabled={!isDirty}>
            Save changes
          </button>
        </div>
      </div>

      {draftCourses.length === 0 ? (
        <div className="table-empty">No courses yet.</div>
      ) : (
        <div className="course-tiles">
          {draftCourses.map((course, index) => (
            <button
              key={`${course.course}-${index}`}
              className="course-tile"
              onClick={() => setActiveIndex(index)}
            >
              <span className="course-code">
                {course.subject}
                {course.number}
              </span>
              <span className="course-tile-meta">
                {course.title || 'Untitled'}
              </span>
            </button>
          ))}
        </div>
      )}

      {activeCourse && activeIndex !== null && (
        <CourseModal
          course={activeCourse}
          onSave={(updated) => {
            updateCourseAt(activeIndex, updated)
            setActiveIndex(null)
          }}
          onDelete={() => {
            deleteCourseAt(activeIndex)
            setActiveIndex(null)
          }}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </div>
  )
}
