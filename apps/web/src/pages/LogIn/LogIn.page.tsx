import { Link } from "@tanstack/react-router"
import { MagicLinkScreen } from "../../components/MagicLinkScreen.component.tsx"

const LEAD =
  "We email you a link. Open it and you are back on your claims, their tokens and every proof you have issued."

export const LogInPage = () => (
  <MagicLinkScreen
    title="Log in"
    lead={LEAD}
    footer={
      <>
        No account yet?{" "}
        <Link to="/sign-up" className="text-foreground underline underline-offset-4">
          Claim a domain — one is made for you.
        </Link>
      </>
    }
  />
)
