import { authClient } from "./auth.client.ts"

export interface Account {
  id: string
  email: string
  name: string
}

export const SESSION_KEY = ["session"] as const

const SESSION_FAILED = "We could not read your session."
const SIGN_OUT_FAILED = "We could not log you out. Try again."

export const readSession = async (): Promise<Account | null> => {
  const { data, error } = await authClient.getSession()
  if (error) throw new Error(error.message ?? SESSION_FAILED)
  if (!data) return null

  const { id, email, name } = data.user
  return { id, email, name }
}

export const endSession = async (): Promise<void> => {
  const { error } = await authClient.signOut()
  if (error) throw new Error(error.message ?? SIGN_OUT_FAILED)
}
