import { Badge } from "@ownsi/ui"
import { Navigate, useParams } from "@tanstack/react-router"
import { Hero, HeroSubtitle, HeroTitle } from "../../components/Hero.component.tsx"
import { MagicLinkPanel } from "../../components/MagicLinkPanel.component.tsx"
import { Page } from "../../components/Page.component.tsx"
import { ProviderGlyph } from "../../components/ProviderGlyph.component.tsx"
import { useSessionState } from "../../hooks/useSessionState.ts"
import { useZoneState } from "../../hooks/useZoneState.ts"
import { providerName } from "../../lib/providers.utils.ts"
import { heroSubtitle } from "./Claim.utils.ts"
import { ZoneReadout } from "./components/ZoneReadout.component.tsx"

const SIGN_IN_DESCRIPTION =
  "The next screen shows the exact TXT record and tracks it live while it propagates. The account is what keeps the claim yours if you close the tab."

export const ClaimPage = () => {
  const { domain } = useParams({ from: "/claim/$domain" })
  const { account, isResolving: isResolvingSession } = useSessionState()
  const { delegation, publishing, isReading, isSlow, failure } = useZoneState({ domain })

  if (account !== null) return <Navigate to="/domains/$domain" params={{ domain }} replace />

  return (
    <Page logIn={false}>
      <Hero>
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
            publishingMinutes: publishing?.publishingMinutes,
          })}
        </HeroSubtitle>

        {isReading ? (
          <div className="flex w-full flex-col items-center pt-4">
            <ZoneReadout delegation={delegation} publishing={publishing} isSlow={isSlow} />
          </div>
        ) : null}
      </Hero>

      <div className="mx-auto flex w-full max-w-[534px] flex-col gap-4 px-6 pt-[30px]">
        {isReading || isResolvingSession || failure ? null : (
          <MagicLinkPanel
            title="Log in to get your record"
            description={SIGN_IN_DESCRIPTION}
            domain={domain}
          />
        )}
      </div>
    </Page>
  )
}
