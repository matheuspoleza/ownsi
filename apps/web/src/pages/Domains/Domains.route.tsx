import { createRoute } from "@tanstack/react-router"
import { rootRoute } from "../../Root.route.tsx"
import { DomainsPage } from "./Domains.page.tsx"

export const domainsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/domains",
  component: DomainsPage,
})
