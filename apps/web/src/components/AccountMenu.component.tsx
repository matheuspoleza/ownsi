import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import { LayoutGrid, LogOut } from "lucide-react"
import type { Account } from "../api/session.api.ts"
import { useSessionEnd } from "../hooks/useSessionEnd.ts"
import { AccountAvatar } from "./AccountAvatar.component.tsx"

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
        <AccountAvatar account={account} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{account.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/domains">
            <LayoutGrid />
            Your domains
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={session.end} disabled={session.isEnding}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
