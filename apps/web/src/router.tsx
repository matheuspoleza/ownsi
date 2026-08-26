import { createRouter } from "@tanstack/react-router"
import { claimRoute } from "./pages/Claim/Claim.route.tsx"
import { domainDetailRoute } from "./pages/DomainDetail/DomainDetail.route.tsx"
import { domainsRoute } from "./pages/Domains/Domains.route.tsx"
import { landingRoute } from "./pages/Landing/Landing.route.tsx"
import { logInRoute } from "./pages/LogIn/LogIn.route.tsx"
import { signUpRoute } from "./pages/SignUp/SignUp.route.tsx"
import { rootRoute } from "./Root.route.tsx"

const routeTree = rootRoute.addChildren([
  landingRoute,
  claimRoute,
  domainsRoute,
  domainDetailRoute,
  logInRoute,
  signUpRoute,
])

export const router = createRouter({ routeTree, defaultPreload: "intent" })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
