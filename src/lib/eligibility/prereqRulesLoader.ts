import type { PrereqRule } from './eligibilityEngine'
import { buildPrereqGraph } from './prereqGraph'

type RulesJson = PrereqRule[]

const modules = import.meta.glob('../../data/prereqs/*.json', { eager: true })

export function loadPrereqRules(): PrereqRule[] {
  return Object.values(modules).flatMap((module) => {
    const data = (module as { default?: RulesJson }).default
    return Array.isArray(data) ? data : []
  })
}

export function loadPrereqGraph() {
  return buildPrereqGraph(loadPrereqRules())
}
