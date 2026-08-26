import { createRoute } from "@tanstack/react-router"
import { rootRoute } from "../../Root.route.tsx"
import { SignUpPage } from "./SignUp.page.tsx"

export const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  component: SignUpPage,
})
