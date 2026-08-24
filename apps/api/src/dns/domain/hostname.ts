export function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "")
}
