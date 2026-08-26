import { Button, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"
import { button, heading, paragraph, quiet } from "../styles.ts"

export interface OtherAccountProvedEmailProps {
  domain: string
  url: string
}

export const OtherAccountProvedEmail = ({ domain, url }: OtherAccountProvedEmailProps) => (
  <EmailLayout preview={`Another account proved ${domain}`}>
    <Section>
      <Text style={heading}>Another account proved {domain}</Text>
      <Text style={paragraph}>
        Someone else demonstrated control of the same name. Your own claim is untouched: it keeps
        its token, its window and its dates, and proving it changes nothing about theirs. A domain
        can be proved by more than one account, because control is shared more often than not.
      </Text>
      <Button href={url} style={button}>
        See your claim
      </Button>
      <Text style={quiet}>
        If nobody on your side should have been able to do that, treat it as a signal about who can
        edit your zone — and check the record list in your DNS panel.
      </Text>
    </Section>
  </EmailLayout>
)

OtherAccountProvedEmail.PreviewProps = {
  domain: "acme.com",
  url: "https://ownsi.dev/domains/dom_1",
} satisfies OtherAccountProvedEmailProps

export default OtherAccountProvedEmail
