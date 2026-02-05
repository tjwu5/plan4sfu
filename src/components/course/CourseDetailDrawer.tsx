import { useEffect, useMemo, useState } from 'react'
import { buildCourseUnlockModel } from '../../lib/plan/buildCourseUnlockModel'
import { normalizeCourseCode, splitCourseCode } from '../../lib/courses/courseCode'
import { getSectionDetail, getSections } from '../../services/sfuOutlinesClient'

type OutlineContext = {
  year: number
  term: string
  dept: string
  number: string
  section?: string
}

type CourseDetailDrawerProps = {
  open: boolean
  onClose: () => void
  courseCode: string | null
  completedCourses: string[]
  plannedCourses?: string[]
  outlineContext?: OutlineContext
  initialTitle?: string
}

export default function CourseDetailDrawer({
  open,
  onClose,
  courseCode,
  completedCourses,
  plannedCourses,
  outlineContext,
  initialTitle,
}: CourseDetailDrawerProps) {
  const [title, setTitle] = useState<string | null>(initialTitle ?? null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const normalizedCourse = courseCode ? normalizeCourseCode(courseCode) : null
  const unlockModel = useMemo(() => {
    if (!normalizedCourse) return null
    return buildCourseUnlockModel(normalizedCourse, {
      completedCourses,
      plannedCourses,
      title: title ?? undefined,
    })
  }, [completedCourses, normalizedCourse, plannedCourses, title])

  useEffect(() => {
    if (!open || !outlineContext || title) return
    let active = true
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const section =
          outlineContext.section ??
          (await getSections(
            outlineContext.year,
            outlineContext.term,
            outlineContext.dept,
            outlineContext.number,
          ))[0]?.value
        if (!section) {
          throw new Error('No sections found.')
        }
        const detail = await getSectionDetail(
          outlineContext.year,
          outlineContext.term,
          outlineContext.dept,
          outlineContext.number,
          section,
        )
        if (!active) return
        setTitle(detail.info?.title ?? null)
      } catch (err) {
        console.error(err)
        if (!active) return
        setLoadError('Unable to load title.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [open, outlineContext, title])

  if (!open || !normalizedCourse) return null

  return (
    <div className="course-drawer" role="dialog" aria-modal="true">
      <button className="course-modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="course-drawer-card">
        <div className="course-modal-header">
          <div>
            <h3>{unlockModel?.course ?? normalizedCourse}</h3>
            {unlockModel?.title && (
              <div className="course-title">{unlockModel.title}</div>
            )}
            {loading && <div className="muted">Loading title…</div>}
            {loadError && <div className="status status-error">{loadError}</div>}
            {unlockModel && (
              <div className="status">
                Status: {unlockModel.status}
              </div>
            )}
          </div>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="course-modal-body">
          <div className="drawer-section">
            <strong>Prerequisites</strong>
            {!unlockModel || unlockModel.prereqs.length === 0 ? (
              <div className="muted">None listed.</div>
            ) : (
              <ul className="course-list">
                {unlockModel.prereqs.map((prereq) => {
                  return (
                    <li key={prereq.code} className="drawer-row">
                      <span className="course-code">{prereq.code}</span>
                      <span
                        className={`badge ${
                          prereq.status === 'completed'
                            ? 'badge-ok'
                            : prereq.status === 'in plan'
                              ? 'badge-plan'
                              : 'badge-missing'
                        }`}
                      >
                        {prereq.status}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            {unlockModel?.missingPrereqs.length ? (
              <div className="muted">
                Missing: {unlockModel.missingPrereqs.join(', ')}
              </div>
            ) : null}
          </div>

          <div className="drawer-section">
            <strong>Unlocks</strong>
            {unlockModel ? (
              <div className="course-meta">
                Unlocks (1 hop): {unlockModel.unlock1} · Unlocks (2 hop): {unlockModel.unlock2}
              </div>
            ) : (
              <div className="muted">No direct unlocks.</div>
            )}
          </div>

          {unlockModel?.prereqRaw && (
            <div className="drawer-section">
              <strong>Needs review</strong>
              <div className="course-meta">{unlockModel.prereqRaw}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
