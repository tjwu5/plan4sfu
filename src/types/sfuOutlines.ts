export type OutlinesListItem = {
  value: string
  text: string
}

export type OutlinesSectionDetail = {
  info?: {
    title?: string
    units?: string
  }
  instructor?: string[]
  prerequisites?: string
  schedule?: Array<{
    sectionCode?: string
    campus?: string
    days?: string
    startTime?: string
    endTime?: string
  }>
}
