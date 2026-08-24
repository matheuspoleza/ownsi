import { createRoute } from "@tanstack/react-router"
import { rootRoute } from "../../Root.route.tsx"
import { ClaimPage } from "./Claim.page.tsx"

export const claimRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/claim/$domain",
  component: ClaimPage,
})
