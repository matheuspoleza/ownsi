import {
  AnimateIcon,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ExternalLinkIcon,
  KeyIcon,
  LayoutDashboardIcon,
  LogOutIcon,
} from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import type { Account } from "../api/session.api.ts"
import { useSessionEnd } from "../hooks/useSessionEnd.ts"
import { DOCS_HOME } from "../lib/docs.constants.ts"
import { Avatar } from "./Avatar.component.tsx"

export interface AccountMenuProps {
  account: Account
}

export const AccountMenu = ({ account }: AccountMenuProps) => {
  const session = useSessionEnd()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="cursor-pointer rounded-full outline-none transition-opacity focus-visible:ring-[3px] focus-visible:ring-ring/40 hover:opacity-80 active:opacity-60"
      >
        <Avatar seed={account.email} title={account.email} className="size-[36px]" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{account.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <AnimateIcon asChild animateOnHover>
          <DropdownMenuItem asChild>
            <Link to="/domains">
              <LayoutDashboardIcon />
              Your domains
            </Link>
          </DropdownMenuItem>
        </AnimateIcon>

        <AnimateIcon asChild animateOnHover>
          <DropdownMenuItem asChild>
            <a href={DOCS_HOME} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              Docs
            </a>
          </DropdownMenuItem>
        </AnimateIcon>

        <DropdownMenuItem disabled>
          <KeyIcon />
          API keys
          <span className="ml-auto rounded-[4px] bg-muted px-1.5 py-[2px] text-[10.5px] text-muted-foreground">
            soon
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <AnimateIcon asChild animateOnHover>
          <DropdownMenuItem onSelect={session.end} disabled={session.isEnding}>
            <LogOutIcon />
            Log out
          </DropdownMenuItem>
        </AnimateIcon>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
