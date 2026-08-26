import { DotWorldMap, WORLD_MAP_FADE } from "@ownsi/ui"
import type { ReactNode } from "react"
import { EXAMPLE_PROOF, EXAMPLE_PUBLICATION } from "../lib/proof.constants.ts"
import { HeroSubtitle, HeroTitle } from "./Hero.component.tsx"
import { MagicLinkPanel } from "./MagicLinkPanel.component.tsx"
import { Page } from "./Page.component.tsx"
import { Perforation } from "./Perforation.component.tsx"
import { ProofTicket } from "./ProofTicket.component.tsx"
import { Reveal } from "./Reveal.component.tsx"

const ASK_SCRIM =
  "radial-gradient(ellipse 46% 52% at 22% 44%, var(--hero-scrim) 0%, var(--hero-scrim) 56%, transparent 100%)"

export interface MagicLinkScreenProps {
  title: string
  lead: string
  /** The way off this screen, for someone who wanted the other one. */
  footer: ReactNode
  /** Offer the log-in link in the header, on the screen that is not it. */
  offerLogIn?: boolean
}

export const MagicLinkScreen = ({
  title,
  lead,
  footer,
  offerLogIn = false,
}: MagicLinkScreenProps) => {
  return (
    <Page logIn={offerLogIn}>
      <section className="relative mx-auto w-full max-w-[1180px] px-6 pt-[60px] lg:pt-[104px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-64px] hidden text-hero-map opacity-45 lg:block"
          style={{ maskImage: WORLD_MAP_FADE, WebkitMaskImage: WORLD_MAP_FADE }}
        >
          <DotWorldMap className="aspect-[360/130] w-full" />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{ background: ASK_SCRIM }}
        />

        <div className="relative grid items-center gap-14 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-20">
          <div className="flex flex-col">
            <Reveal>
              <HeroTitle>{title}</HeroTitle>
            </Reveal>

            <Reveal delayMs={100} className="pt-4">
              <HeroSubtitle>{lead}</HeroSubtitle>
            </Reveal>

            <Reveal delayMs={200} className="pt-[34px]">
              <MagicLinkPanel />
            </Reveal>

            <Reveal delayMs={300} className="pt-[46px]">
              <Perforation />
            </Reveal>

            <Reveal
              delayMs={360}
              className="pt-[26px] font-body text-[13.5px] text-muted-foreground"
            >
              {footer}
            </Reveal>
          </div>

          <div className="flex justify-center lg:justify-end">
            <Reveal delayMs={240}>
              <ProofTicket
                domain={EXAMPLE_PROOF.domain}
                provedAt={EXAMPLE_PROOF.provedAt}
                provider={EXAMPLE_PROOF.provider}
                token={EXAMPLE_PROOF.token}
                publication={EXAMPLE_PUBLICATION}
                className="w-[298px] shadow-[0_18px_44px_-16px_rgb(15_92_54/0.35)]"
              />
            </Reveal>
          </div>
        </div>
      </section>
    </Page>
  )
}
