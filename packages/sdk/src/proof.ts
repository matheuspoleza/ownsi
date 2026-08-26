import { type Treaty, unwrap } from "./client.ts"

type ClaimRequest = ReturnType<Treaty["claims"]>

export type ProofLinkData = NonNullable<
  Awaited<ReturnType<ClaimRequest["proof_links"]["post"]>>["data"]
>

/** `live` is the only one that resolves; the other two are kept because sharing is history. */
export type ProofLinkStanding = ProofLinkData["standing"]

export type ProofLink = ProofLinkData & {
  /** Stops the slug resolving. It retracts nothing: the proof keeps its date. */
  readonly revoke: () => Promise<ProofLink>
}

export type ProofLinks = {
  /** Idempotent while one is live: asking twice hands back the same slug. */
  readonly publish: (claimId: string) => Promise<ProofLink>
  readonly list: (claimId: string) => Promise<readonly ProofLink[]>
}

export function proof(api: Treaty): ProofLinks {
  return {
    publish: (claimId) => publishProofLink(api, claimId),
    list: (claimId) => listProofLinks(api, claimId),
  }
}

export async function publishProofLink(api: Treaty, claimId: string): Promise<ProofLink> {
  return asProofLink(api, await unwrap(api.claims({ id: claimId }).proof_links.post()))
}

export async function listProofLinks(api: Treaty, claimId: string): Promise<readonly ProofLink[]> {
  const { links } = await unwrap(api.claims({ id: claimId }).proof_links.get())

  return links.map((link) => asProofLink(api, link))
}

function asProofLink(api: Treaty, data: ProofLinkData): ProofLink {
  return {
    ...data,
    revoke: async () =>
      asProofLink(
        api,
        await unwrap(
          api.claims({ id: data.claimId }).proof_links({ slug: data.slug }).revoke.post(),
        ),
      ),
  }
}
