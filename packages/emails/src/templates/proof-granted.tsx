import { Button, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"
import { button, heading, paragraph, quiet } from "../styles.ts"

export interface ProofGrantedEmailProps {
  domain: string
  provedAt: string
  url: string
}

export const ProofGrantedEmail = ({ domain, provedAt, url }: ProofGrantedEmailProps) => (
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
      <Text style={quiet}>You can delete the record whenever you like.</Text>
    </Section>
  </EmailLayout>
)
