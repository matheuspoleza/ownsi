import { createRoute } from "@tanstack/react-router"
import { rootRoute } from "../../Root.route.tsx"
import { DomainDetailPage } from "./DomainDetail.page.tsx"

export const domainDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/domains/$domain",
  component: DomainDetailPage,
})
