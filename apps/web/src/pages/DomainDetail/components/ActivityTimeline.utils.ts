import type { AttemptData } from "../../../api/verification.api.ts"

export type EntryTone = "idle" | "success" | "warning" | "error"

export interface ActivityEntry {
  id: string
  title: string
  at: string
  tone: EntryTone
}

/** The same event, repeated back to back. `at` is the most recent of the run. */
export interface ActivityGroup extends ActivityEntry {
  count: number
}

const OUTCOME_TITLES: Record<AttemptData["outcome"], string> = {
  found: "Record found",
  absent: "Check found nothing",
  unresolvable: "Resolvers did not answer",
}

const OUTCOME_TONES: Record<AttemptData["outcome"], EntryTone> = {
  found: "success",
  absent: "error",
  unresolvable: "idle",
}

export const attemptEntry = (attempt: AttemptData): ActivityEntry => ({
  id: attempt.id,
  title: OUTCOME_TITLES[attempt.outcome],
  at: attempt.at,
  tone: OUTCOME_TONES[attempt.outcome],
})

/** Entries arrive newest first, so the run keeps the timestamp it opened with. */
export const groupActivity = (entries: readonly ActivityEntry[]): readonly ActivityGroup[] => {
  const groups: ActivityGroup[] = []

  for (const entry of entries) {
    const open = groups.at(-1)

    if (open && open.title === entry.title && open.tone === entry.tone) {
      groups[groups.length - 1] = { ...open, count: open.count + 1 }
      continue
    }

    groups.push({ ...entry, count: 1 })
  }

  return groups
}
