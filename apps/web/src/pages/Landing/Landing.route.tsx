import { createRoute } from "@tanstack/react-router"
import { rootRoute } from "../../Root.route.tsx"
import { LandingPage } from "./Landing.page.tsx"

export const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
})
