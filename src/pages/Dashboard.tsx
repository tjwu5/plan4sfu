import { useEffect, useMemo, useState } from 'react'
import CourseDetailDrawer from '../components/course/CourseDetailDrawer'
import ConcentrationCard from '../components/concentrations/ConcentrationCard'
import { useCompletedCourses } from '../hooks/useCompletedCourses'
import { evaluateCSRequirements, is400Level } from '../lib/degree/csRequirementsEngine'
import {
  computeConcentrationBlockers,
  loadConcentrationConfig,
} from '../lib/degree/csRequirementsEngine'
import { getEligibilityReport } from '../lib/eligibility/eligibilityEngine'
import { loadPrereqGraph, loadPrereqRules } from '../lib/eligibility/prereqRulesLoader'
import { normalizeCourseCode } from '../lib/courses/courseCode'
import { rankConcentrationNextPicks } from '../lib/degree/concentrationNextPicks'

type BlockerItem = { course: string; blocksCount: number }

export default function Dashboard() {
  const [completedCourses] = useCompletedCourses()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerCourse, setDrawerCourse] = useState<string | null>(null)

  const completedCodes = useMemo(
    () => completedCourses.map((course) => course.course),
    [completedCourses],
  )

  const [report, setReport] = useState<ReturnType<typeof evaluateCSRequirements> | null>(null)
  const [topBlockers, setTopBlockers] = useState<BlockerItem[]>([])
  const [eligibleCourses, setEligibleCourses] = useState<string[]>([])

  useEffect(() => {
    setLoading(true)
    setError(null)
    try {
      const normalizedCompleted = completedCodes.map(normalizeCourseCode)
      const prereqRules = loadPrereqRules()
      const concentrationConfig = loadConcentrationConfig()

      const evaluation = evaluateCSRequirements({
        completedCourses: normalizedCompleted,
      })
      const blockerResults = computeConcentrationBlockers({
        areas: concentrationConfig.areas ?? [],
        completed: new Set(normalizedCompleted),
        prereqRules,
        maxBlockers: 8,
      })

      const blockerCounts = new Map<string, number>()
      blockerResults.forEach((area) => {
        area.blockers.forEach((blocker) => {
          blockerCounts.set(
            blocker.course,
            (blockerCounts.get(blocker.course) ?? 0) + blocker.blocksCount,
          )
        })
      })

      const top = Array.from(blockerCounts.entries())
        .map(([course, blocksCount]) => ({ course, blocksCount }))
        .sort(
          (a, b) =>
            b.blocksCount - a.blocksCount ||
            a.course.localeCompare(b.course, 'en-US'),
        )
        .slice(0, 3)

      const eligible = getEligibilityReport(
        {},
        completedCourses,
        prereqRules,
      ).eligible

      setReport(evaluation)
      setTopBlockers(top)
      setEligibleCourses(eligible)
    } catch (err) {
      console.error(err)
      setError('Unable to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [completedCodes, completedCourses])

  const concentrationCards = useMemo(() => {
    if (!report) return []
    const prereqGraph = loadPrereqGraph()
    return report.concentrations.map((area) => {
      const eligibleInArea = eligibleCourses.filter((course) =>
        area.allCourses.includes(normalizeCourseCode(course)),
      )
      const unlockCounts = new Map(
        eligibleInArea.map((course) => [
          course,
          prereqGraph.getUnlockCount(course, 2),
        ]),
      )
      const picks = rankConcentrationNextPicks({
        eligibleCourses: eligibleInArea,
        need400: area.missing400Count > 0,
        unlockCounts,
        is400Level,
      }).slice(0, 3)

      const nextPicks = picks.map((course) => {
        const unlock = unlockCounts.get(course) ?? 0
        const parts = ['Eligible now', `unlocks ${unlock} courses`]
        if (area.missing400Count > 0 && is400Level(course)) {
          parts.push('helps 400-level requirement')
        }
        return {
          course,
          reason: parts.join(' • '),
        }
      })

      return {
        area: area.area,
        completedCount: area.completed.length,
        completed400Count: area.completed400.length,
        isSatisfied: area.isSatisfied,
        countsSoFar: area.completed.slice(0, 4),
        blockers: area.blockers.slice(0, 3),
        nextPicks,
      }
    })
  }, [eligibleCourses, report])

  const nextBestActions = useMemo(() => {
    if (!report) return []
    const lowerMissing = new Set(report.lowerDiv.missing)
    const areasByCourse = new Map<string, string[]>()
    report.concentrations.forEach((area) => {
      area.allCourses.forEach((course) => {
        const list = areasByCourse.get(course) ?? []
        list.push(area.area)
        areasByCourse.set(course, list)
      })
    })

    const scored = eligibleCourses.map((course) => {
      const areaHits = areasByCourse.get(course) ?? []
      const areaNeeds = report.concentrations.filter(
        (area) =>
          areaHits.includes(area.area) && area.missingCoursesCount > 0,
      )
      const needs400 =
        is400Level(course) &&
        report.concentrations.some((area) => area.missing400Count > 0)
      const score =
        (lowerMissing.has(course) ? 3 : 0) +
        (areaNeeds.length > 0 ? 2 : 0) +
        (needs400 ? 1 : 0)
      return {
        course,
        score,
        why: [
          lowerMissing.has(course) ? 'Counts toward lower division.' : null,
          areaNeeds.length > 0
            ? `Counts toward ${areaNeeds[0].area}.`
            : null,
          needs400 ? 'Contributes to 400-level requirement.' : null,
        ].filter(Boolean) as string[],
      }
    })

    return scored
      .filter((item) => item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.course.localeCompare(b.course, 'en-US'),
      )
      .slice(0, 3)
  }, [eligibleCourses, report])

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p className="muted">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="page">
        <div className="card">
          <p className="status status-error">{error ?? 'Unable to load.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Your progress overview and next steps.</p>
        </div>
      </div>

      <div className="grid">
        <div className="card stack">
          <h3>Graduation Snapshot</h3>
          <div className="course-meta">
            Lower division missing: {report.lowerDiv.missing.length}
          </div>
          <div className="course-meta">
            Upper division/core missing: {report.upperDivCore.missing.length}
          </div>
          <div className="course-meta">
            Breadth/depth status: Not yet evaluated
          </div>
          <div className="muted">Earliest grad term (estimate): TBD</div>
        </div>

        <div className="card stack">
          <h3>Top Blockers</h3>
          {topBlockers.length === 0 ? (
            <p className="muted">No blockers identified yet.</p>
          ) : (
            <ul className="course-list">
              {topBlockers.map((blocker) => (
                <li key={blocker.course}>
                  <button
                    className="course-code"
                    onClick={() => setDrawerCourse(blocker.course)}
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
      </div>

      <div className="grid">
        <div className="stack">
          <h3>Concentration Progress</h3>
          <div className="grid">
            {concentrationCards.map((card) => (
              <ConcentrationCard
                key={card.area}
                area={card.area}
                completedCount={card.completedCount}
                completed400Count={card.completed400Count}
                isSatisfied={card.isSatisfied}
                countsSoFar={card.countsSoFar}
                blockers={card.blockers}
                nextPicks={card.nextPicks}
                onCourseClick={(course) => setDrawerCourse(course)}
              />
            ))}
          </div>
        </div>

        <div className="card stack">
          <h3>Next Best Actions</h3>
          {nextBestActions.length === 0 ? (
            <p className="muted">No eligible courses found yet.</p>
          ) : (
            <ul className="course-list">
              {nextBestActions.map((item) => (
                <li key={item.course}>
                  <button
                    className="course-code"
                    onClick={() => setDrawerCourse(item.course)}
                  >
                    {item.course}
                  </button>
                  {item.why.length > 0 && (
                    <ul className="course-list">
                      {item.why.map((why) => (
                        <li key={why} className="muted">
                          {why}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <CourseDetailDrawer
        open={drawerCourse !== null}
        onClose={() => setDrawerCourse(null)}
        courseCode={drawerCourse}
        completedCourses={completedCodes}
      />
    </div>
  )
}
