import type { Offering } from '../../types'

const days = ['Mo', 'Tu', 'We', 'Th', 'Fr']

const minutesToTop = (minutes: number) => ((minutes - 480) / 600) * 100

const minutesToHeight = (start: number, end: number) =>
  Math.max(8, ((end - start) / 600) * 100)

export default function WeeklyGrid({ offerings }: { offerings: Offering[] }) {
  return (
    <div className="weekly-grid">
      <div className="grid-header">
        {days.map((day) => (
          <div key={day} className="grid-day">
            {day}
          </div>
        ))}
      </div>
      <div className="grid-body">
        {days.map((day) => (
          <div key={day} className="grid-column">
            {offerings
              .filter((offering) => offering.days.includes(day))
              .map((offering, index) => (
                <div
                  key={`${offering.courseId}-${offering.section}-${index}`}
                  className="grid-block"
                  style={{
                    top: `${minutesToTop(offering.startMinutes)}%`,
                    height: `${minutesToHeight(
                      offering.startMinutes,
                      offering.endMinutes,
                    )}%`,
                  }}
                >
                  <strong>{offering.courseId}</strong>
                  <div>{offering.section}</div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
