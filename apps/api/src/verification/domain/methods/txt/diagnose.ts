import { unreachable } from "../../../../shared/result.ts"
import type { AttemptOutcome } from "../../attempt.ts"
import type { Quorum, TxtChallenge, TxtObservation } from "./observation.ts"
import { PROBES, whenNothingElseExplainsIt } from "./probes.ts"

export function diagnoseTxt(observation: TxtObservation, challenge: TxtChallenge): AttemptOutcome {
  if (observation.challenge.type === "failed") return whenNobodyAnswered(observation.challenge)

  if (observation.challenge.records.txt.includes(challenge.token)) {
    return { type: "found", value: challenge.token }
  }

  for (const probe of PROBES) {
    const diagnosis = probe(observation, challenge)
    if (diagnosis) return { type: "absent", diagnosis }
  }

  return { type: "absent", diagnosis: whenNothingElseExplainsIt(observation) }
}

function whenNobodyAnswered(quorum: Extract<Quorum, { type: "failed" }>): AttemptOutcome {
  switch (quorum.failure) {
    case "servfail":
      return {
        type: "absent",
        diagnosis: { code: "servfail", observed: { resolvers: quorum.resolvers } },
      }
    case "unreachable":
      return { type: "unresolvable", resolvers: quorum.resolvers }
    default:
      return unreachable(quorum.failure)
  }
}
