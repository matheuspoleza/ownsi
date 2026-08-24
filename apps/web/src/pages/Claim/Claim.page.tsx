import { Badge } from "@ownsi/ui"
import { useParams } from "@tanstack/react-router"
import { CheckEmailCard } from "../../components/CheckEmailCard.component.tsx"
import { Hero, HeroSubtitle, HeroTitle } from "../../components/Hero.component.tsx"
import { LogInCard } from "../../components/LogInCard.component.tsx"
import { Page } from "../../components/Page.component.tsx"
import { ProviderGlyph } from "../../components/ProviderGlyph.component.tsx"
import { useMagicLinkSend } from "../../hooks/useMagicLinkSend.ts"
import { providerName } from "../../lib/providers.utils.ts"
import { heroSubtitle } from "./Claim.utils.ts"
import { ZoneReadout } from "./components/ZoneReadout.component.tsx"
import { useZoneState } from "./hooks/useZoneState.ts"

export const ClaimPage = () => {
  const { domain } = useParams({ from: "/claim/$domain" })
  const { delegation, publishing, isReading, isSlow, failure } = useZoneState({ domain })
  const magicLink = useMagicLinkSend({ domain })

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

      {isReading || failure ? null : (
        <div className="mx-auto flex max-w-[1180px] justify-center px-6 pt-[30px]">
          {magicLink.sentTo ? (
            <CheckEmailCard
              email={magicLink.sentTo}
              domain={domain}
              onUseAnother={magicLink.useAnotherAddress}
            />
          ) : (
            <LogInCard
              title="Log in to get your record"
              description="The next screen shows the exact TXT record and tracks it live while it propagates. The account is what keeps the claim yours if you close the tab."
              pending={magicLink.isSending}
              error={magicLink.hasFailed ? "We could not send that link. Try again." : null}
              onSubmit={magicLink.send}
            />
          )}
        </div>
      )}
    </Page>
  )
}
