import { cn, DotWorldMap, WORLD_MAP_FADE } from "@ownsi/ui"
import type { ReactNode } from "react"
import { VantageField } from "./VantageField.component.tsx"
import type { MapStory } from "./VantageField.constants.ts"

const SCRIM =
  "radial-gradient(ellipse 50% 52.5% at 50% 50%, var(--hero-scrim) 0%, var(--hero-scrim) 46%, transparent 100%)"

export interface HeroProps {
  children: ReactNode
  className?: string
  story?: MapStory
}

export const Hero = ({ children, className, story }: HeroProps) => (
  <section
    className={cn("relative flex min-h-[320px] items-center overflow-hidden py-8", className)}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden text-hero-map animate-[ownsi-fade_1600ms_cubic-bezier(0.33,1,0.68,1)_200ms_both] motion-reduce:animate-none"
      style={{ maskImage: WORLD_MAP_FADE, WebkitMaskImage: WORLD_MAP_FADE }}
    >
      <DotWorldMap className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 aspect-[360/130] w-full max-w-[1440px]" />
    </div>

    <div
      aria-hidden
      className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 h-[320px] w-[1180px] animate-[ownsi-fade_1600ms_cubic-bezier(0.33,1,0.68,1)_200ms_both] motion-reduce:animate-none"
      style={{ background: SCRIM }}
    />

    <VantageField story={story} />

    <div className="relative flex w-full flex-col items-center gap-[11px] px-6 text-center">
      {children}
    </div>
  </section>
)

export interface HeroTextProps {
  children: ReactNode
}

export const HeroTitle = ({ children }: HeroTextProps) => (
  <h1 className="font-semibold text-[28px] text-foreground leading-[1.2] tracking-[-0.8px] sm:text-[34px]">
    {children}
  </h1>
)

export const HeroSubtitle = ({ children }: HeroTextProps) => (
  <p className="max-w-[520px] text-muted-foreground text-sm leading-[1.4]">{children}</p>
)
