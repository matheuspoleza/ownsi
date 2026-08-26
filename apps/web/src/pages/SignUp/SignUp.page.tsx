import { Link } from "@tanstack/react-router"
import { MagicLinkScreen } from "../../components/MagicLinkScreen.component.tsx"

const LEAD =
  "There is no password to choose. We email you a link, and opening it makes the account."

export const SignUpPage = () => (
  <MagicLinkScreen
    title="Sign up"
    lead={LEAD}
    offerLogIn
    footer={
      <>
        Already have an account?{" "}
        <Link to="/log-in" className="text-foreground underline underline-offset-4">
          Log in.
        </Link>
      </>
    }
  />
)
