export type DomainsDriver = "postgres" | "demo"

export type DomainsConfig = {
  readonly driver: DomainsDriver
  readonly appUrl: string
}
