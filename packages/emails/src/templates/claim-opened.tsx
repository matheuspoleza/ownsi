import { Button, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"
import { button, heading, paragraph, quiet, record } from "../styles.ts"

export interface ClaimOpenedEmailProps {
  domain: string
  host: string
  token: string
  url: string
}

export const ClaimOpenedEmail = ({ domain, host, token, url }: ClaimOpenedEmailProps) => (
  <EmailLayout preview={`One TXT record on ${host} proves ${domain}`}>
    <Section>
      <Text style={heading}>One TXT record proves {domain}</Text>
      <Text style={paragraph}>
        ownsi is reading {host} and keeps reading for seven days. The moment this record answers,
        the claim is proved and carries the date it was read.
      </Text>
      <Text style={record}>
        TXT {host}
        <br />
        {token}
      </Text>
      <Text style={paragraph}>
        If someone else administers this zone, forward this email — everything needed to write the
        record is above, and none of it grants access to an ownsi account.
      </Text>
      <Button href={url} style={button}>
        Follow the check
      </Button>
      <Text style={quiet}>
        There is nothing to do here but the record. ownsi writes again when what it reads changes,
        and once more if the seven days run out.
      </Text>
    </Section>
  </EmailLayout>
)

ClaimOpenedEmail.PreviewProps = {
  domain: "acme.com",
  host: "_ownsi-challenge.acme.com",
  token: "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058",
  url: "https://ownsi.dev/domains/dom_1",
} satisfies ClaimOpenedEmailProps

export default ClaimOpenedEmail
