export type GoogleCredentials = {
  readonly clientId: string
  readonly clientSecret: string
}

export type AuthConfig = {
  readonly secret: string
  readonly baseUrl: string
  readonly basePath: string
  readonly magicLinkTtlSeconds: number
  readonly google: GoogleCredentials | null
}
