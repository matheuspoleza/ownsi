import { Button, Link, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"
import { button, heading, paragraph, quiet } from "../styles.ts"

export interface ProofGrantedEmailProps {
  domain: string
  provedAt: string
  url: string
  proofUrl: string | null
}

export const ProofGrantedEmail = ({ domain, provedAt, url, proofUrl }: ProofGrantedEmailProps) => (
  <EmailLayout preview={`${domain} is proved`}>
    <Section>
      <Text style={heading}>{domain} is yours, and dated</Text>
      <Text style={paragraph}>
        The record was there when we looked on {provedAt}. That date is what the proof carries, and
        it does not move: nothing re-checks a proved claim, so removing the TXT record from now on
        changes nothing about this.
      </Text>
      <Button href={url} style={button}>
        See the proof
      </Button>
      {proofUrl === null ? null : (
        <Text style={paragraph}>
          Anyone can read it here, no account needed: <Link href={proofUrl}>{proofUrl}</Link>. Take
          the link back whenever you like — the proof stands either way.
        </Text>
      )}
      <Text style={quiet}>You can delete the record whenever you like.</Text>
    </Section>
  </EmailLayout>
)

ProofGrantedEmail.PreviewProps = {
  domain: "acme.com",
  provedAt: "24 August 2026",
  url: "https://ownsi.dev/domains/dom_1",
  proofUrl: "https://ownsi.dev/p/9f3a1c7d",
} satisfies ProofGrantedEmailProps

export default ProofGrantedEmail
