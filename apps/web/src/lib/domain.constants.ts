export const CONSUMER_EMAIL_HOSTS = new Set([
  "aol.com",
  "fastmail.com",
  "gmail.com",
  "gmx.com",
  "googlemail.com",
  "hey.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "mail.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "yahoo.com",
  "yandex.com",
  "zoho.com",
])

const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
const TLD = "(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})"

export const HOSTNAME = new RegExp(`^(?:${LABEL}\\.)+${TLD}$`)
export const EMAIL = /^[^\s@]+@[^\s@]+$/
export const MAX_HOSTNAME_LENGTH = 253
