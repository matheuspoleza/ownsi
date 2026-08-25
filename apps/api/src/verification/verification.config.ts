import type { TxtResolverId } from "./infra/doh-txt.ts"

export type VerificationDriver = "doh" | "fake"

export type VerificationConfig = {
  readonly driver: VerificationDriver
  readonly recursiveResolvers: readonly TxtResolverId[]
  readonly resolverTimeoutMs: number
  readonly authoritativeBudgetMs: number
}
