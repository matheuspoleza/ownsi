export interface ProofPublication {
  /** Where the page lives, in full — what a browser and a badge need. */
  url: string
  /** The same address without its scheme, which is what a ticket prints. */
  link: string
  badge: string
}

export const proofPublication = (url: string): ProofPublication => ({
  url,
  link: url.replace(/^https?:\/\//, ""),
  badge: `[![Proved with ownsi](${url}/badge.svg)](${url})`,
})
