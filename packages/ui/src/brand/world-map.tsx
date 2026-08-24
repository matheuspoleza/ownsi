import type * as React from "react"
import { cn } from "../lib/utils.ts"
import { WORLD_MAP_PATH, WORLD_MAP_VIEWBOX } from "./world-map-path.ts"

export function DotWorldMap({ className, style, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden
      role="presentation"
      viewBox={WORLD_MAP_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("fill-current", className)}
      style={style}
      {...props}
    >
      <path d={WORLD_MAP_PATH} />
    </svg>
  )
}

export const WORLD_MAP_FADE =
  "radial-gradient(ellipse 95% 52.5% at 50% 50%, #000 0%, #000 62%, transparent 100%)"
