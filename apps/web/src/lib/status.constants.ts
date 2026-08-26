/** One word per state, shared by the list and the page, so a name reads the same in both. */
export type DomainStatus = "unclaimed" | "pending" | "checking" | "proved" | "expired" | "canceled"

/** What the server can filter on: `checking` is a shade of `pending`, never a tab of its own. */
export type DomainFilter = Exclude<DomainStatus, "checking">

/** The order the filter offers, so a tab never moves when a count changes. */
export const STATUS_ORDER: readonly DomainFilter[] = [
  "pending",
  "proved",
  "expired",
  "canceled",
  "unclaimed",
]

export const STATUS_LABELS: Record<DomainStatus, string> = {
  unclaimed: "unclaimed",
  pending: "pending",
  checking: "checking",
  proved: "proved",
  expired: "expired",
  canceled: "canceled",
}

/** A filled dot is a state the account is in; a hollow one is a state it left. */
export const STATUS_DOTS: Record<DomainStatus, string> = {
  unclaimed: "border border-muted-foreground/50",
  pending: "bg-error",
  checking: "bg-warning",
  proved: "bg-success",
  expired: "border border-warning/60",
  canceled: "border border-muted-foreground/50",
}

export const STATUS_INKS: Record<DomainStatus, string> = {
  unclaimed: "text-muted-foreground",
  pending: "text-foreground",
  checking: "text-foreground",
  proved: "text-foreground",
  expired: "text-muted-foreground",
  canceled: "text-muted-foreground",
}

/** The same word once it carries its own ground, on a page that states one status only. */
export const STATUS_PILLS: Record<DomainStatus, string> = {
  unclaimed: "bg-muted text-muted-foreground",
  pending: "bg-error-subtle text-error",
  checking: "bg-warning-subtle text-warning",
  proved: "bg-success-subtle text-success",
  expired: "bg-warning-subtle text-warning",
  canceled: "bg-muted text-muted-foreground",
}

/** The ground under the row's glyph, so the state is legible before the word is read. */
export const STATUS_PLATES: Record<DomainStatus, string> = {
  unclaimed: "border-border bg-card text-muted-foreground",
  pending: "border-error/25 bg-error-subtle text-error",
  checking: "border-warning/25 bg-warning-subtle text-warning",
  proved: "border-success/25 bg-success-subtle text-success",
  expired: "border-warning/25 bg-warning-subtle text-warning",
  canceled: "border-border bg-muted text-muted-foreground",
}
