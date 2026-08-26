/**
 * Where a proof sits in the order of proofs of the same name. It states time, never rank:
 * an earlier proof is not a worse one, and nothing here revokes anything.
 */
export type Recency =
  | { readonly type: "latest" }
  | { readonly type: "earlier"; readonly latestProvedAt: Date }

export function recencyOf(provedAt: Date, latestProvedAt: Date | null): Recency {
  if (latestProvedAt === null || latestProvedAt.getTime() <= provedAt.getTime()) {
    return { type: "latest" }
  }

  return { type: "earlier", latestProvedAt }
}
