import { Hero, HeroSubtitle, HeroTitle } from "../../components/Hero.component.tsx"
import { MagicLinkPanel } from "../../components/MagicLinkPanel.component.tsx"
import { Page } from "../../components/Page.component.tsx"

export const LogInPage = () => (
  <Page logIn={false}>
    <Hero>
      <HeroTitle>Log in</HeroTitle>
      <HeroSubtitle>Your claims, their tokens and every proof you have issued.</HeroSubtitle>
    </Hero>

    <div className="mx-auto flex max-w-[1180px] justify-center px-6 pt-[30px]">
      <MagicLinkPanel
        title="Log in to ownsi"
        description="We email you a link. Open it and you are back where you left off — no password to remember, on any device."
      />
    </div>
  </Page>
)
