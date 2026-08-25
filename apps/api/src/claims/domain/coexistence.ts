export type Coexistence = {
  readonly maskedEmail: string
  readonly provedAt: string
}

export function maskEmail(email: string): string {
  const [local = "", host = ""] = email.split("@")

  return `${local.slice(0, 1)}•••@${host}`
}
