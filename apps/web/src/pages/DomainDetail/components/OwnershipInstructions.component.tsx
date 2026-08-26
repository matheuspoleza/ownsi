import type { ChallengeRecord } from "../../../api/claim.api.ts"
import { ProviderGlyph } from "../../../components/ProviderGlyph.component.tsx"
import { isDemoName } from "../../../lib/demo.utils.ts"
import type { ProviderId } from "../../../lib/providers.constants.ts"
import { providerInstruction, providerName } from "../../../lib/providers.utils.ts"
import { RecordRow } from "./RecordRow.component.tsx"

export interface OwnershipInstructionsProps {
  domain: string
  provider: ProviderId
  record: ChallengeRecord
}

export const OwnershipInstructions = ({ domain, provider, record }: OwnershipInstructionsProps) => {
  const instruction = providerInstruction(provider)
  const ours = isDemoName(domain)

  return (
    <section className="flex flex-col gap-3.5 pt-[26px]">
      <div className="flex flex-col gap-[7px]">
        <h2 className="font-semibold text-[13px] text-foreground">
          {ours ? "The record we publish" : "Ownership instructions"}
        </h2>
        <p className="text-[13px] text-muted-foreground leading-[1.5]">
          {ours ? (
            <>
              {domain} is ours, so Ownsi publishes this record and reads it back the same way it
              reads anyone else's. Nothing to paste into a DNS panel — watch the check below run.{" "}
            </>
          ) : (
            <>
              Only whoever controls DNS for {domain} can publish this record. That is what makes it
              proof.{" "}
            </>
          )}
          <a
            href="https://docs.ownsi.dev"
            target="_blank"
            rel="noreferrer"
            aria-label="Learn how ownsi verifies a domain"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Learn more
          </a>
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-border border-b px-3.5 py-3">
          <ProviderGlyph provider={provider} className="size-[18px]" />
          <span className="font-medium text-[13px] text-foreground">{providerName(provider)}</span>
          <span className="truncate text-[13px] text-muted-foreground">
            · {ours ? "published by Ownsi" : instruction.where}
          </span>
        </div>

        <RecordRow label="Type" value={record.type} />
        <RecordRow label={instruction.hostLabel} value={record.host} copyable />
        <RecordRow label={instruction.valueLabel} value={record.value} copyable />
        <RecordRow label="TTL" value="Auto" />
      </div>
    </section>
  )
}
