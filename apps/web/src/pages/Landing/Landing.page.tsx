import { DotWorldMap, WORLD_MAP_FADE } from "@ownsi/ui"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { DomainField } from "../../components/DomainField.component.tsx"
import { HeroSubtitle, HeroTitle } from "../../components/Hero.component.tsx"
import { Page } from "../../components/Page.component.tsx"
import { Perforation } from "../../components/Perforation.component.tsx"
import { ProofTicket } from "../../components/ProofTicket.component.tsx"
import { Reveal } from "../../components/Reveal.component.tsx"
import { Sentinel } from "../../components/Sentinel.component.tsx"
import { EXAMPLE_PROOF, EXAMPLE_PUBLICATION } from "../../lib/proof.constants.ts"
import { HowItWorks } from "./components/HowItWorks.component.tsx"
import { WitnessReadout } from "./components/WitnessReadout.component.tsx"
import { AUTHORITY, HEADLINE, LEAD, WITNESSES } from "./Landing.constants.ts"

const ISSUE_PATH =
  "block h-[56px] w-[3px] bg-[length:3px_10px] bg-[radial-gradient(circle_at_center,var(--border)_1.5px,transparent_1.5px)]"

export const LandingPage = () => {
  const navigate = useNavigate()
  const [typed, setTyped] = useState("")

  return (
    <Page>
      <section className="relative mx-auto w-full max-w-[1180px] px-6 pt-[52px] lg:pt-[86px]">
        <div
          aria-hidden
          className="pointer-events-none absolute top-[-46px] right-[-200px] hidden w-[940px] text-hero-map opacity-50 lg:block"
          style={{ maskImage: WORLD_MAP_FADE, WebkitMaskImage: WORLD_MAP_FADE }}
        >
          <DotWorldMap className="aspect-[360/130] w-full" />
        </div>

        <div className="relative grid gap-16 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-20">
          <div className="flex flex-col">
            <Reveal>
              <HeroTitle>{HEADLINE}</HeroTitle>
            </Reveal>

            <Reveal delayMs={100} className="pt-4">
              <HeroSubtitle>{LEAD}</HeroSubtitle>
            </Reveal>

            <Reveal delayMs={200} className="relative pt-[34px]">
              <Sentinel
                typed={typed}
                className="right-[2px] bottom-[calc(100%-34px)] h-[52px] w-[124px]"
              />

              <DomainField
                onValueChange={setTyped}
                onSubmit={(domain) => navigate({ to: "/claim/$domain", params: { domain } })}
              />
            </Reveal>

            <Reveal delayMs={300} className="pt-[42px]">
              <Perforation />
            </Reveal>

            <Reveal delayMs={360} className="pt-[28px]">
              <HowItWorks />
            </Reveal>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="flex w-full max-w-[520px] flex-col items-center">
              <Reveal delayMs={160} className="w-full">
                <WitnessReadout
                  domain={EXAMPLE_PROOF.domain}
                  witnesses={WITNESSES}
                  value={EXAMPLE_PROOF.value}
                  authority={AUTHORITY}
                />
              </Reveal>

              <Reveal delayMs={480} className="flex justify-center py-2">
                <span aria-hidden className={ISSUE_PATH} />
              </Reveal>

              <Reveal delayMs={560}>
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
        </div>
      </section>
    </Page>
  )
}
