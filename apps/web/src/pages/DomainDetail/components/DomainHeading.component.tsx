import { Button } from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Globe, RefreshCw } from "lucide-react"

export interface DomainAction {
  label: string
  pending: boolean
  onClick: () => void
}

export interface DomainHeadingProps {
  domain: string
  action: DomainAction | null
}

export const DomainHeading = ({ domain, action }: DomainHeadingProps) => (
  <div className="flex flex-col">
    <Link
      to="/domains"
      className="flex w-fit items-center gap-1.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Domains
    </Link>

    <div className="flex items-center gap-6 pt-[18px]">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[11px] border border-border bg-muted">
          <Globe className="size-5 text-muted-foreground" strokeWidth={1.5} />
        </span>

        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-[12px] text-muted-foreground">Domain</span>
          <h1 className="truncate font-semibold text-[30px] text-foreground leading-none tracking-[-0.7px]">
            {domain}
          </h1>
        </span>
      </div>

      {action ? (
        <Button
          size="sm"
          onClick={action.onClick}
          pending={action.pending}
          icon={<RefreshCw />}
          iconPosition="leading"
          className="h-[34px] shrink-0 px-3.5"
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  </div>
)
