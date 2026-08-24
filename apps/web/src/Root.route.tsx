import { createRootRoute, Outlet } from "@tanstack/react-router"
import { DevAnnotations } from "./components/DevAnnotations.component.tsx"

export const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <DevAnnotations />
    </>
  ),
})
