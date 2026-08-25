import { Inngest } from "inngest"

export type InngestConfig = {
  readonly driver: "inngest" | "manual"
  readonly id: string
  readonly isDev: boolean
  readonly baseUrl: string | null
  readonly eventKey: string
  readonly signingKey: string
}

export type InngestClient = Inngest

export function createInngest(config: InngestConfig): InngestClient {
  return new Inngest({
    id: config.id,
    isDev: config.isDev,
    baseUrl: config.baseUrl ?? undefined,
    eventKey: config.eventKey === "" ? undefined : config.eventKey,
  })
}
