import {
  AnimateIcon,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EllipsisIcon,
  GlobeIcon,
  RefreshCwIcon,
} from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Fragment, type ReactNode } from "react"

export interface DomainAction {
  label: string
  pending: boolean
  onClick: () => void
}

export interface DomainMenuItem {
  label: string
  icon: ReactNode
  onSelect: () => void
  /** Sits below a rule, away from the items that undo nothing. */
  separated?: boolean
}

export interface DomainHeadingProps {
  domain: string
  action: DomainAction | null
  menu: readonly DomainMenuItem[]
  /** The plate takes the tone of the proof: green once the name is proved, neutral before. */
  proved?: boolean
  /** Off the list. The name still reads, and says so above itself. */
  archived?: boolean
}

export const DomainHeading = ({
  domain,
  action,
  menu,
  proved = false,
  archived = false,
}: DomainHeadingProps) => (
  <div className="flex flex-col">
    <Link
      to="/domains"
      className="flex w-fit items-center gap-1.5 py-1.5 font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      domains
    </Link>

    <div className="flex items-center gap-6 pt-[14px]">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <AnimateIcon asChild animateOnHover>
          <span
            className={cn(
              "flex size-[46px] shrink-0 items-center justify-center rounded-[11px]",
              proved ? "bg-success/10" : "border border-border bg-muted",
            )}
          >
            <GlobeIcon
              className={cn("size-5", proved ? "text-success" : "text-muted-foreground")}
              strokeWidth={1.6}
            />
          </span>
        </AnimateIcon>

        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
            Domain
            {archived ? (
              <span className="rounded-full bg-muted px-2 py-[2px] font-mono text-[11px] text-muted-foreground">
                archived
              </span>
            ) : null}
          </span>
          <h1
            className={cn(
              "truncate font-mono font-medium text-[26px] leading-none tracking-[-0.4px]",
              archived ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {domain}
          </h1>
        </span>
      </div>

      <span className="flex shrink-0 items-center gap-2">
        {action ? (
          <Button
            size="sm"
            onClick={action.onClick}
            pending={action.pending}
            icon={<RefreshCwIcon />}
            iconPosition="leading"
            className="h-[36px] px-3.5 font-mono lowercase"
          >
            {action.label}
          </Button>
        ) : null}

        {menu.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More" className="size-[36px]">
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menu.map((item) => (
                <Fragment key={item.label}>
                  {item.separated ? <DropdownMenuSeparator /> : null}
                  <AnimateIcon asChild animateOnHover>
                    <DropdownMenuItem onSelect={item.onSelect}>
                      {item.icon}
                      {item.label}
                    </DropdownMenuItem>
                  </AnimateIcon>
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </span>
    </div>
  </div>
)
