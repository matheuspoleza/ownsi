import { createRouter } from "@tanstack/react-router"
import { claimRoute } from "./pages/Claim/Claim.route.tsx"
import { landingRoute } from "./pages/Landing/Landing.route.tsx"
import { logInRoute } from "./pages/LogIn/LogIn.route.tsx"
import { rootRoute } from "./Root.route.tsx"

const routeTree = rootRoute.addChildren([landingRoute, claimRoute, logInRoute])

export const router = createRouter({ routeTree, defaultPreload: "intent" })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
