/** Notionists, by Zoish, CC0 1.0 — no attribution owed and no network call at render. */
const GROUNDS = ["#EEF3EC", "#F5EEE6", "#EAEFF6", "#F3ECF4", "#FBF0EE", "#E9F1F2"] as const

const sumOf = (seed: string) => [...seed].reduce((total, letter) => total + letter.charCodeAt(0), 0)

/** Known before the drawing arrives, so the circle never changes colour under the reader. */
export const avatarGround = (seed: string): string =>
  GROUNDS[sumOf(seed) % GROUNDS.length] ?? GROUNDS[0]

export type DrawAvatar = (seed: string) => string

/**
 * The style pack is 120kB gzipped, which is more than the rest of the page: it loads on its
 * own after first paint rather than in the entry chunk.
 */
export const loadAvatarDrawer = async (): Promise<DrawAvatar> => {
  const [{ createAvatar }, notionists] = await Promise.all([
    import("@dicebear/core"),
    import("@dicebear/notionists"),
  ])

  return (seed) =>
    createAvatar(notionists, {
      seed,
      backgroundColor: GROUNDS.map((ground) => ground.slice(1)),
      radius: 50,
      scale: 88,
      translateY: 8,
    }).toDataUri()
}
