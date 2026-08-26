import { TooltipProvider } from "@ownsi/ui"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { DevAnnotations } from "./components/DevAnnotations.component.tsx"
import { useLiveUpdates } from "./hooks/useLiveUpdates.ts"
import { useSessionState } from "./hooks/useSessionState.ts"

const Root = () => {
  const { account } = useSessionState()
  useLiveUpdates({ enabled: account !== null })

  return (
    <TooltipProvider>
      <Outlet />
      <DevAnnotations />
    </TooltipProvider>
  )
}

export const rootRoute = createRootRoute({ component: Root })
