import { useState } from "react"
import { DomainField } from "../../../components/DomainField.component.tsx"
import { Sentinel } from "../../../components/Sentinel.component.tsx"
import { inPlay, rowFor } from "../Domains.utils.ts"
import type { DomainRow } from "../hooks/useDashboardState.ts"

export interface DomainsHeadingProps {
  rows: readonly DomainRow[]
  onClaim: (domain: string) => void
  /** The typed name is already on this account, so the bar opens it instead of claiming it twice. */
  onOpen: (domain: string) => void
  /** The person is typing again, so whatever the last attempt said stops being true. */
  onEdit: () => void
  pending: boolean
  /** What went wrong with the last name typed here, in the API's own words. */
  failure: string | null
}

export const DomainsHeading = ({
  rows,
  onClaim,
  onOpen,
  onEdit,
  pending,
  failure,
}: DomainsHeadingProps) => {
  const [typed, setTyped] = useState("")

  const known = rowFor(rows, typed)
  const opens = known !== null && inPlay(known)

  return (
    <div className="relative flex flex-col pt-[34px]">
      <h1 className="font-semibold text-[24px] text-foreground leading-none tracking-[-0.5px]">
        Domains
      </h1>

      <Sentinel typed={typed} className="top-[9px] left-[180px] h-[81px] w-[124px]" />

      <div className="relative pt-[18px]">
        <DomainField
          submitLabel={opens ? "Open" : "Claim"}
          onSubmit={(domain) => (known && opens ? onOpen(known.listed.name) : onClaim(domain))}
          onValueChange={(value) => {
            setTyped(value)
            onEdit()
          }}
          pending={pending}
          invalid={failure !== null}
        />

        {failure ? (
          <p role="alert" className="pt-2 text-[12px] text-error">
            {failure}
          </p>
        ) : null}
      </div>
    </div>
  )
}
