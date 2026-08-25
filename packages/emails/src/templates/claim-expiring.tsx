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
