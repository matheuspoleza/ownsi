import { Button, OwnsiLogo } from "@ownsi/ui"
import { Link } from "@tanstack/react-router"

export interface SiteHeaderProps {
  logIn?: boolean
}

export const SiteHeader = ({ logIn = true }: SiteHeaderProps) => (
  <header className="border-border border-b bg-background">
    <div className="mx-auto flex h-[58px] max-w-[1180px] items-center justify-between px-6">
      <Link to="/" aria-label="ownsi home">
        <OwnsiLogo />
      </Link>
      {logIn ? (
        <Button variant="ghost" size="sm" asChild>
          <Link to="/log-in">Log in</Link>
        </Button>
      ) : null}
    </div>
  </header>
)
