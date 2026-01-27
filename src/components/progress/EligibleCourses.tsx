type EligibleCoursesProps = {
  courses: string[]
}

export default function EligibleCourses({ courses }: EligibleCoursesProps) {
  return (
    <div className="card stack">
      <h3>Eligible Courses</h3>
      {courses.length === 0 ? (
        <p className="muted">No eligible courses found yet.</p>
      ) : (
        <ul className="course-list">
          {courses.map((course) => (
            <li key={course} className="eligible-row">
              <span className="course-code">{course}</span>
              <span className="muted">Ready to enroll</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
