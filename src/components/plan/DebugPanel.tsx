import type { Offering } from '../../types'

export default function DebugPanel({ offering }: { offering?: Offering }) {
  if (!offering) return null
  return (
    <details className="debug-panel">
      <summary>Debug: normalized offering</summary>
      <pre className="debug-content">{JSON.stringify(offering, null, 2)}</pre>
    </details>
  )
}
