import { Badge } from "@ownsi/ui"
import { useParams } from "@tanstack/react-router"
import { Hero, HeroSubtitle, HeroTitle } from "../../components/Hero.component.tsx"
import { MagicLinkPanel } from "../../components/MagicLinkPanel.component.tsx"
import { Page } from "../../components/Page.component.tsx"
import { ProviderGlyph } from "../../components/ProviderGlyph.component.tsx"
import { Reveal } from "../../components/Reveal.component.tsx"
import { Sentinel } from "../../components/Sentinel.component.tsx"
import { useSessionState } from "../../hooks/useSessionState.ts"
import { useZoneState } from "../../hooks/useZoneState.ts"
import { providerName } from "../../lib/providers.utils.ts"
import { heroSubtitle } from "./Claim.utils.ts"
import { ZoneReadout } from "./components/ZoneReadout.component.tsx"
import { useClaimHandoff } from "./hooks/useClaimHandoff.ts"

const SIGN_IN_DESCRIPTION =
  "The next screen shows the exact TXT record and tracks it live while it propagates. The account is what keeps the claim yours if you close the tab."

export const ClaimPage = () => {
  const { domain } = useParams({ from: "/claim/$domain" })
  const { account, isResolving: isResolvingSession } = useSessionState()
  const { delegation, publishing, isReading, isSlow, failure } = useZoneState({ domain })

  const signedIn = account !== null
  const handoff = useClaimHandoff({ domain, signedIn })

  const signIn = !isResolvingSession && !signedIn && !failure

  return (
    <Page logIn={false}>
      <Hero story="checking" className="min-h-[290px]">
        {delegation ? (
          <Badge>
            <span className="flex size-[19px] shrink-0 items-center justify-center rounded-[5px] border border-border bg-card">
              <ProviderGlyph provider={delegation.provider} className="size-[11px]" />
            </span>
            {providerName(delegation.provider)}
          </Badge>
        ) : null}

        <HeroTitle>{domain}</HeroTitle>

        <HeroSubtitle>
          {heroSubtitle({
            failure,
            isReading,
            isOpening: handoff.isOpening,
            publishingMinutes: publishing?.publishingMinutes,
          })}
        </HeroSubtitle>

        {handoff.failure ? (
          <p role="alert" className="pt-2 text-[12px] text-error">
            {handoff.failure.message}
          </p>
        ) : null}
      </Hero>

      <div className="mx-auto grid w-full max-w-[1000px] items-start gap-x-16 gap-y-10 px-6 lg:grid-cols-[minmax(0,468px)_minmax(0,1fr)]">
        {failure ? null : (
          <div className="relative w-full">
            <Sentinel
              typed=""
              className="right-[6px] bottom-[calc(100%-30px)] h-[48px] w-[124px]"
            />

            <ZoneReadout
              domain={domain}
              delegation={delegation}
              publishing={publishing}
              isSlow={isSlow}
            />
          </div>
        )}

        {signIn ? (
          <Reveal delayMs={80} className="flex w-full justify-center">
            <MagicLinkPanel
              title="Log in to get your record"
              description={SIGN_IN_DESCRIPTION}
              domain={domain}
            />
          </Reveal>
        ) : null}
      </div>
    </Page>
  )
}
