import { Button, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"
import { button, heading, paragraph, quiet } from "../styles.ts"

export interface ClaimExpiredEmailProps {
  domain: string
  url: string
}

export const ClaimExpiredEmail = ({ domain, url }: ClaimExpiredEmailProps) => (
  <EmailLayout preview={`The window on ${domain} closed`}>
    <Section>
      <Text style={heading}>The window on {domain} closed</Text>
      <Text style={paragraph}>
        Seven days passed without the record being readable, so this claim has ended and its token
        no longer stands for anything.
      </Text>
      <Text style={paragraph}>
        Claiming the name again issues a new token. If you already created the record, it is in the
        right place — the new claim is one edit to its value rather than a record from scratch.
      </Text>
      <Button href={url} style={button}>
        Claim it again
      </Button>
      <Text style={quiet}>
        Nothing about the name changed while the window was open, and nobody else gained anything by
        it closing.
      </Text>
    </Section>
  </EmailLayout>
)

ClaimExpiredEmail.PreviewProps = {
  domain: "acme.com",
  url: "https://ownsi.dev/domains/dom_1",
} satisfies ClaimExpiredEmailProps

export default ClaimExpiredEmail
