export const OWNSI_ERROR_CODES = [
  "invalid_domain",
  "no_delegation",
  "unresolvable",
  "unauthenticated",
  "already_claimed",
  "claim_ended",
  "domain_archived",
  "domain_not_found",
  "claim_not_found",
  "verification_not_found",
  "verification_not_running",
  "proof_not_found",
  "proof_revoked",
  "rate_limited",
  "unreachable",
] as const

export type OwnsiErrorCode = (typeof OWNSI_ERROR_CODES)[number]

/** `unreachable` is the only code the API never sends: it means no answer arrived at all. */
export type OwnsiError = Error & {
  readonly code: OwnsiErrorCode
  readonly docsUrl: string
}

export const RETRYABLE: ReadonlySet<OwnsiErrorCode> = new Set([
  "unresolvable",
  "unreachable",
  "rate_limited",
])

const DOCS_BASE_URL = "https://docs.ownsi.dev/errors"

const UNREACHABLE_MESSAGE = "We could not reach ownsi. Check your connection and try again."

export function ownsiError(
  code: OwnsiErrorCode,
  message: string,
  docsUrl = `${DOCS_BASE_URL}#${code}`,
): OwnsiError {
  return Object.assign(new Error(message), { code, docsUrl })
}

export function asOwnsiError(value: unknown): OwnsiError {
  const body = value && typeof value === "object" && "value" in value ? value.value : value
  if (!body || typeof body !== "object" || !("error" in body)) {
    return ownsiError("unreachable", UNREACHABLE_MESSAGE)
  }

  const detail = (body as { error: { code?: unknown; message?: unknown; docsUrl?: unknown } }).error
  if (!isCode(detail.code) || typeof detail.message !== "string") {
    return ownsiError("unreachable", UNREACHABLE_MESSAGE)
  }

  return ownsiError(
    detail.code,
    detail.message,
    typeof detail.docsUrl === "string" ? detail.docsUrl : undefined,
  )
}

export function isOwnsiError(value: unknown): value is OwnsiError {
  return value instanceof Error && "code" in value && isCode(value.code)
}

function isCode(value: unknown): value is OwnsiErrorCode {
  return typeof value === "string" && (OWNSI_ERROR_CODES as readonly string[]).includes(value)
}
