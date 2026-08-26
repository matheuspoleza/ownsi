export interface ProofPublication {
  /** Where the page lives, in full — what a browser and a badge need. */
  url: string
  /** The same address without its scheme, which is what a ticket prints. */
  link: string
  badge: string
  /** The same proof read by a program, as the one line a reader can paste and run. */
  api: string
}

export const proofPublication = (url: string): ProofPublication => {
  const { origin, pathname } = new URL(url)
  const slug = pathname.slice(pathname.lastIndexOf("/") + 1)

  return {
    url,
    link: url.replace(/^https?:\/\//, ""),
    badge: `[![Proved with ownsi](${url}/badge.svg)](${url})`,
    api: `curl ${origin}/api/proofs/${slug}`,
  }
}
