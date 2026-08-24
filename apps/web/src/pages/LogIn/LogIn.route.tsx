import { createRoute } from "@tanstack/react-router"
import { rootRoute } from "../../Root.route.tsx"
import { LogInPage } from "./LogIn.page.tsx"

export const logInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/log-in",
  component: LogInPage,
})
