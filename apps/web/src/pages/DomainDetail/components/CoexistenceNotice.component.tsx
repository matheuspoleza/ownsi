import { ArrowUpRight, Users } from "lucide-react"
import { DOCS_COEXISTENCE } from "../../../lib/docs.constants.ts"

export interface CoexistenceNoticeProps {
  domain: string
}

export const CoexistenceNotice = ({ domain }: CoexistenceNoticeProps) => (
  <section className="mt-6 flex gap-3 rounded-xl border border-info/25 bg-info-subtle px-4 py-[13px]">
    <Users className="mt-[3px] size-[15px] shrink-0 text-info" strokeWidth={1.6} />

    <div className="flex min-w-0 flex-col items-start gap-2">
      <h2 className="font-semibold text-[13.5px] text-foreground">
        Another account has already proved {domain}
      </h2>

      <p className="text-[12.5px] text-muted-foreground">
        Proving it yourself revokes nothing. Theirs keeps its date and stays true — but yours
        becomes the most recent proof of this name, and every page showing an earlier one will say a
        later proof exists.
      </p>

      <p className="text-[12.5px] text-foreground">
        If nobody else should be able to write to this zone, that is worth looking into: somebody
        demonstrated that they could.
      </p>

      <a
        href={DOCS_COEXISTENCE}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 pt-0.5 font-mono text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        how disputes work
        <ArrowUpRight className="size-3.5" />
      </a>
    </div>
  </section>
)
