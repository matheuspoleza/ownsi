import type { Account } from "../api/session.api.ts"

const initialsOf = ({ name, email }: Account) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const from = words.length > 0 ? words : [email]
  const first = from[0]?.[0] ?? "?"
  const second = words.length > 1 ? (words[1]?.[0] ?? "") : ""
  return `${first}${second}`.toUpperCase()
}

export interface AccountAvatarProps {
  account: Account
}

export const AccountAvatar = ({ account }: AccountAvatarProps) => (
  <span
    title={account.email}
    className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[11.5px] text-foreground"
  >
    {initialsOf(account)}
  </span>
)
