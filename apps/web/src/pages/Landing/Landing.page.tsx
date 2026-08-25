import { useNavigate } from "@tanstack/react-router"
import { DomainField } from "../../components/DomainField.component.tsx"
import { Hero, HeroSubtitle, HeroTitle } from "../../components/Hero.component.tsx"
import { Page } from "../../components/Page.component.tsx"
import { Reveal } from "../../components/Reveal.component.tsx"
import { HowItWorks } from "./components/HowItWorks.component.tsx"
import { ProofTicket } from "./components/ProofTicket.component.tsx"
import { EXAMPLE_PROOF } from "./Landing.constants.ts"

export const LandingPage = () => {
  const navigate = useNavigate()

  return (
    <Page>
      <Hero story="proven">
        <Reveal>
          <HeroTitle>Prove a domain is yours</HeroTitle>
        </Reveal>

        <Reveal delayMs={120}>
          <HeroSubtitle>
            Add one TXT record. We read it back from resolvers around the world.
          </HeroSubtitle>
        </Reveal>

        <Reveal delayMs={260} className="flex w-full flex-col items-center pt-[15px]">
          <DomainField
            onSubmit={(domain) => navigate({ to: "/claim/$domain", params: { domain } })}
          />
        </Reveal>
      </Hero>

      <div className="mx-auto max-w-[1180px] px-6">
        <Reveal className="pt-[34px]">
          <HowItWorks />
        </Reveal>

        <Reveal delayMs={180} className="flex flex-col items-center pt-[46px]">
          <ProofTicket proof={EXAMPLE_PROOF} />
        </Reveal>
      </div>
    </Page>
  )
}
