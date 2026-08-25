import { Button, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"
import { button, heading, paragraph, quiet, record } from "../styles.ts"

export interface ClaimNudgeEmailProps {
  domain: string
  host: string
  token: string
  cause: string
  fix: string
  url: string
}

export const ClaimNudgeEmail = ({ domain, host, token, cause, fix, url }: ClaimNudgeEmailProps) => (
  <EmailLayout preview={`${domain} is still waiting on one DNS record`}>
    <Section>
      <Text style={heading}>{domain} is still waiting</Text>
      <Text style={paragraph}>{cause}</Text>
      <Text style={paragraph}>{fix}</Text>
      <Text style={record}>
        TXT {host}
        <br />
        {token}
      </Text>
      <Button href={url} style={button}>
        Check it now
      </Button>
      <Text style={quiet}>
        We keep looking on our own, so there is nothing to do here but the record. The window is
        open for seven days from when you claimed the name.
      </Text>
    </Section>
  </EmailLayout>
)
