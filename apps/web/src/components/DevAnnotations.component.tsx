import { lazy, Suspense } from "react"

const SYNC_ENDPOINT = "http://localhost:4747"

const Panel = import.meta.env.DEV
  ? lazy(() => import("agentation").then((m) => ({ default: m.Agentation })))
  : null

export const DevAnnotations = () => {
  if (!Panel) return null
  return (
    <Suspense fallback={null}>
      <Panel endpoint={SYNC_ENDPOINT} />
    </Suspense>
  )
}
