import { CheckEmailCard } from "../../components/CheckEmailCard.component.tsx"
import { Hero, HeroSubtitle, HeroTitle } from "../../components/Hero.component.tsx"
import { LogInCard } from "../../components/LogInCard.component.tsx"
import { Page } from "../../components/Page.component.tsx"
import { useMagicLinkSend } from "../../hooks/useMagicLinkSend.ts"

export const LogInPage = () => {
  const magicLink = useMagicLinkSend()

  return (
    <Page logIn={false}>
      <Hero>
        <HeroTitle>Log in</HeroTitle>
        <HeroSubtitle>Your claims, their tokens and every proof you have issued.</HeroSubtitle>
      </Hero>

      <div className="mx-auto flex max-w-[1180px] justify-center px-6 pt-[30px]">
        {magicLink.sentTo ? (
          <CheckEmailCard email={magicLink.sentTo} onUseAnother={magicLink.useAnotherAddress} />
        ) : (
          <LogInCard
            title="Log in to ownsi"
            description="We email you a link. Open it and you are back where you left off — no password to remember, on any device."
            pending={magicLink.isSending}
            error={magicLink.hasFailed ? "We could not send that link. Try again." : null}
            onSubmit={magicLink.send}
          />
        )}
      </div>
    </Page>
  )
}
