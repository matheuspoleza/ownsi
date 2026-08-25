import { Button, OwnsiLogo } from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import { useSessionState } from "../hooks/useSessionState.ts"
import { AccountMenu } from "./AccountMenu.component.tsx"

export interface SiteHeaderProps {
  /** Offer the log-in link to a visitor with no session. Off on the pages that already ask. */
  logIn?: boolean
}

export const SiteHeader = ({ logIn = true }: SiteHeaderProps) => {
  const { account, isResolving } = useSessionState()

  return (
    <header className="border-border border-b bg-background">
      <div className="mx-auto flex h-[58px] max-w-[1180px] items-center justify-between px-6">
        <Link to={account ? "/domains" : "/"} aria-label="ownsi home">
          <OwnsiLogo />
        </Link>

        {account ? <AccountMenu account={account} /> : null}

        {!account && !isResolving && logIn ? (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/log-in">Log in</Link>
          </Button>
        ) : null}
      </div>
    </header>
  )
}
