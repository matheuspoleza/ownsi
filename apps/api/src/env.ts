// Environment is read once. Fail at boot, not on the first request.
function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing env var: ${key}`)
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  challengePrefix: process.env.CHALLENGE_PREFIX ?? "_ownsi-challenge",
  databaseUrl: required("DATABASE_URL"),
  dnsDriver: (process.env.DNS_DRIVER ?? "doh") as "doh" | "fake",
}
