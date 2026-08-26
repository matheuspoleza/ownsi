import { type KeyboardEvent, useRef } from "react"
import type { DomainRow } from "./useDashboardState.ts"

export interface UseRowKeysOptions {
  rows: readonly DomainRow[]
  readingId: string | null
  onRead: (domainId: string) => void
}

export const useRowKeys = ({ rows, readingId, onRead }: UseRowKeysOptions) => {
  const list = useRef<HTMLDivElement>(null)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = rows.findIndex((row) => row.listed.id === readingId)
    const landing = landingFor(event.key, at, rows.length)
    const row = landing === null ? undefined : rows[landing]
    if (landing === null || row === undefined) return

    event.preventDefault()
    onRead(row.listed.id)
    list.current?.querySelectorAll<HTMLElement>("[data-row]")[landing]?.focus()
  }

  return { list, onKeyDown }
}

const landingFor = (key: string, at: number, count: number): number | null => {
  if (count === 0) return null

  switch (key) {
    case "ArrowDown":
      return Math.min(at + 1, count - 1)
    case "ArrowUp":
      return Math.max(at - 1, 0)
    case "Home":
      return 0
    case "End":
      return count - 1
    default:
      return null
  }
}
