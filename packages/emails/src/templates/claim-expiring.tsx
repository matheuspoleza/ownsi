import { Button, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"
import { button, heading, paragraph, quiet, record } from "../styles.ts"

export interface ClaimExpiringEmailProps {
  domain: string
  host: string
  token: string
  cause: string
  fix: string
  url: string
}

export const ClaimExpiringEmail = ({
  domain,
  host,
  token,
  cause,
  fix,
  url,
}: ClaimExpiringEmailProps) => (
  <EmailLayout preview={`The window on ${domain} closes tomorrow`}>
    <Section>
      <Text style={heading}>The window on {domain} closes tomorrow</Text>
      <Text style={paragraph}>{cause}</Text>
      <Text style={paragraph}>{fix}</Text>
      <Text style={record}>
        TXT {host}
        <br />
        {token}
      </Text>
      <Button href={url} style={button}>
        Fix it and check
      </Button>
      <Text style={quiet}>
        If the window closes, nothing is lost: claiming the name again issues a new token, and one
        edit in your DNS panel starts the clock over.
      </Text>
    </Section>
  </EmailLayout>
)

ClaimExpiringEmail.PreviewProps = {
  domain: "acme.com",
  host: "_ownsi-challenge.acme.com",
  token: "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058",
  cause:
    "ns1.registrar.example and ns2.registrar.example answer for acme.com, and the record is not in what they serve.",
  fix: "Create the record, or reopen it in your panel and confirm it saved — some panels hold zone changes in a draft until you publish them.",
  url: "https://ownsi.dev/domains/dom_1",
} satisfies ClaimExpiringEmailProps

export default ClaimExpiringEmail
