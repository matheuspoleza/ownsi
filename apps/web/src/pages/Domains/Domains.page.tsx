import { OwnsiSentinel } from "@ownsi/ui"
import { useNavigate } from "@tanstack/react-router"
import { DomainField } from "../../components/DomainField.component.tsx"
import { Hero, HeroSubtitle, HeroTitle } from "../../components/Hero.component.tsx"
import { MagicLinkPanel } from "../../components/MagicLinkPanel.component.tsx"
import { Page } from "../../components/Page.component.tsx"
import { useClaimStart } from "../../hooks/useClaimStart.ts"
import { useNow } from "../../hooks/useNow.ts"
import { useSessionState } from "../../hooks/useSessionState.ts"
import { AllDomains } from "./components/AllDomains.component.tsx"
import { ClaimsInProgress } from "./components/ClaimsInProgress.component.tsx"
import { ProofWallet } from "./components/ProofWallet.component.tsx"
import { useDashboardState } from "./hooks/useDashboardState.ts"

const TICK_MS = 1_000

const EMPTY =
  "Nothing claimed yet. Type a name above and we read its zone before anything is written to DNS."

export const DomainsPage = () => {
  const navigate = useNavigate()
  const { account, isResolving: isResolvingSession } = useSessionState()

  const signedIn = account !== null
  const { open, proved, domains, isResolving } = useDashboardState({ enabled: signedIn })
  const start = useClaimStart({
    onCreated: (claimed) => navigate({ to: "/domains/$domain", params: { domain: claimed } }),
  })
  const now = useNow(TICK_MS)

  const settled = signedIn && !isResolving

  return (
    <Page logIn={false}>
      <Hero>
        <HeroTitle>Prove a domain is yours</HeroTitle>
        <HeroSubtitle>
          Add one TXT record. We read it back from resolvers around the world.
        </HeroSubtitle>

        {signedIn ? (
          <div className="flex w-full flex-col items-center pt-[15px]">
            <DomainField onSubmit={start.start} pending={start.isStarting} />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 mx-auto hidden max-w-[1180px] px-6 lg:block">
          <OwnsiSentinel
            aria-hidden
            className="absolute right-0 bottom-0 h-[145px] w-[103px] text-foreground"
          />
        </div>
      </Hero>

      <div className="mx-auto flex w-full max-w-[1180px] flex-col px-6">
        {!isResolvingSession && !signedIn ? (
          <div className="flex justify-center pt-[30px]">
            <MagicLinkPanel
              title="Log in to ownsi"
              description="We email you a link. Open it and your domains are here, with the claim on each one where you left it."
            />
          </div>
        ) : null}

        {settled && open.length > 0 ? <ClaimsInProgress entries={open} now={now} /> : null}

        {settled && proved.length > 0 ? <ProofWallet entries={proved} /> : null}

        {settled && domains.length > 0 ? <AllDomains summaries={domains} /> : null}

        {settled && domains.length === 0 ? (
          <p className="pt-7 text-[13px] text-muted-foreground">{EMPTY}</p>
        ) : null}
      </div>
    </Page>
  )
}
