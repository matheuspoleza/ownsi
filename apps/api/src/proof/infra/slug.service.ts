import type { GenerateSlug } from "../domain/ports.ts"

/** No vowels and no look-alikes, so a slug read aloud or copied by hand still resolves. */
const ALPHABET = "23456789bcdfghjkmnpqrstvwxz"

const SLUG_LENGTH = 10

export const randomSlug: GenerateSlug = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH))
  return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join("")
}
