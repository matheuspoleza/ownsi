import type { Step } from "../domain/ports.ts"

export type InngestStepApi = {
  readonly run: (id: string, body: () => Promise<unknown>) => Promise<unknown>
  readonly sleepUntil: (id: string, at: Date) => Promise<unknown>
}

export function inngestStep(step: InngestStepApi): Step {
  return {
    run: async <T>(id: string, body: () => Promise<T>) => (await step.run(id, body)) as T,
    sleepUntil: async (id, at) => {
      await step.sleepUntil(id, at)
    },
  }
}
