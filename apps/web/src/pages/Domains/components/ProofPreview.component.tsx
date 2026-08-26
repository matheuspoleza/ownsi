import { ProofTicket } from "../../../components/ProofTicket.component.tsx"
import { PREVIEW_RECORD } from "../Domains.constants.ts"
import { ProofShare } from "./ProofShare.component.tsx"

const TITLE = "What you get"

const CAPTION = "A proof of ownership, once the record reads back."

export interface ProofPreviewProps {
  domain: string
}

export const ProofPreview = ({ domain }: ProofPreviewProps) => (
  <section className="flex flex-col gap-4 pt-10">
    <div className="flex flex-col gap-1">
      <h2 className="font-semibold text-[13.5px] text-foreground">{TITLE}</h2>
      <p className="text-[12.5px] text-muted-foreground">{CAPTION}</p>
    </div>

    <div className="flex flex-col gap-8 lg:flex-row lg:gap-[34px]">
      <ProofTicket
        domain={domain}
        provedAt={null}
        token={PREVIEW_RECORD.value}
        publication={null}
        className="w-full shrink-0 opacity-45 lg:w-[320px]"
      />

      <ProofShare
        publication={null}
        onPublish={() => {}}
        onRevoke={() => {}}
        isPublishing={false}
        preview
      />
    </div>
  </section>
)
