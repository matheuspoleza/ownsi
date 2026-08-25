import type { AttemptOutcome } from "../../attempt.ts"
import { challengeHost } from "../../diagnosis.ts"
import type { ReadZoneFacts } from "../../ports.ts"
import { diagnoseTxt } from "./diagnose.ts"
import {
  type HostRecords,
  type Quorum,
  quorum,
  type ResolverReading,
  readAuthority,
  type TxtChallenge,
  type TxtObservation,
} from "./observation.ts"
import type { AskAuthoritativeTxt, LookupTxt } from "./ports.ts"

export type TxtMethodDeps = {
  readonly lookupTxt: LookupTxt
  readonly askAuthoritative: AskAuthoritativeTxt
  readonly readZoneFacts: ReadZoneFacts
}

export type CheckTxtChallenge = (
  challenge: TxtChallenge,
  signal?: AbortSignal,
) => Promise<AttemptOutcome>

export function checkTxtChallenge(deps: TxtMethodDeps): CheckTxtChallenge {
  return async (challenge, signal) => {
    const decided = quorum(await deps.lookupTxt(challengeHost(challenge.domain), signal))

    if (decided.type === "agreed" && decided.records.txt.includes(challenge.token)) {
      return { type: "found", value: challenge.token }
    }
    if (decided.type === "failed") return diagnoseTxt(nothingElseSeen(decided), challenge)

    return diagnoseTxt(await explainAbsence(deps, challenge, decided.records, signal), challenge)
  }
}

function nothingElseSeen(challenge: Quorum): TxtObservation {
  return { challenge, apex: null, www: null, appended: null, authoritative: { type: "unknown" } }
}

async function explainAbsence(
  deps: TxtMethodDeps,
  challenge: TxtChallenge,
  records: HostRecords,
  signal?: AbortSignal,
): Promise<TxtObservation> {
  const { domain, token } = challenge
  const host = challengeHost(domain)

  const [apex, www, appended, zone] = await Promise.all([
    agreedAt(deps.lookupTxt, domain, signal),
    agreedAt(deps.lookupTxt, challengeHost(`www.${domain}`), signal),
    agreedAt(deps.lookupTxt, `${host}.${domain}`, signal),
    deps.readZoneFacts(domain, signal),
  ])

  const answered = zone.type === "answering"
  const authority = answered
    ? await deps.askAuthoritative(host, zone.nameservers, signal)
    : ({ type: "unknown" } as const)

  return {
    challenge: { type: "agreed", records },
    apex,
    www,
    appended,
    authoritative: readAuthority(authority, token, answered ? zone.negativeCacheTtlSeconds : null),
  }
}

async function agreedAt(
  lookupTxt: LookupTxt,
  name: string,
  signal?: AbortSignal,
): Promise<HostRecords | null> {
  const readings: readonly ResolverReading[] = await lookupTxt(name, signal)
  const decided = quorum(readings)

  return decided.type === "agreed" ? decided.records : null
}
