import { authClient } from "./auth.client.ts"

export interface Account {
  id: string
  email: string
  name: string
}

export const SESSION_KEY = ["session"] as const

const SESSION_FAILED = "We could not read your session."

export const readSession = async (): Promise<Account | null> => {
  const { data, error } = await authClient.getSession()
  if (error) throw new Error(error.message ?? SESSION_FAILED)
  if (!data) return null

  const { id, email, name } = data.user
  return { id, email, name }
}

export const endSession = async (): Promise<void> => {
  await authClient.signOut()
}
