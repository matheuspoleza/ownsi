import { PREVIEW_RECORD } from "../Domains.constants.ts"

const TITLE = "No domains yet"

const BODY =
  "Claim one above. You add a single TXT record to its zone, and we read it back from three public resolvers and the zone's own nameservers before we call it proved."

const SHELVED_TITLE = "Nothing on your list"

const SHELVED_BODY =
  "Claim a domain above, or open the archived tab — everything you took off the list is still there, with every claim it carried."

export interface NoDomainsYetProps {
  /** How many names are waiting on the shelf. Nothing on the list is a different empty. */
  archived?: number
}

export const NoDomainsYet = ({ archived = 0 }: NoDomainsYetProps) => {
  const shelved = archived > 0

  return (
    <section className="flex flex-col items-center gap-[9px] rounded-lg border border-border bg-card px-10 pt-[38px] pb-10">
      <h2 className="font-semibold text-[15px] text-foreground">
        {shelved ? SHELVED_TITLE : TITLE}
      </h2>

      <p className="max-w-[430px] text-center text-[13px] text-muted-foreground leading-[1.6]">
        {shelved ? SHELVED_BODY : BODY}
      </p>

      {shelved ? null : (
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 rounded-md bg-muted px-3.5 py-[11px] font-mono text-[12px] text-muted-foreground">
          <span className="break-all">{PREVIEW_RECORD.host}</span>
          <span>{PREVIEW_RECORD.type}</span>
          <span>{PREVIEW_RECORD.value}</span>
        </p>
      )}
    </section>
  )
}
