import { Button, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"
import { button, heading, paragraph, quiet, record } from "../styles.ts"

export interface ClaimProgressEmailProps {
  domain: string
  host: string
  token: string
  cause: string
  fix: string
  url: string
}

export const ClaimProgressEmail = ({
  domain,
  host,
  token,
  cause,
  fix,
  url,
}: ClaimProgressEmailProps) => (
  <EmailLayout preview={cause}>
    <Section>
      <Text style={heading}>What ownsi reads at {domain} changed</Text>
      <Text style={paragraph}>{cause}</Text>
      <Text style={paragraph}>{fix}</Text>
      <Text style={record}>
        TXT {host}
        <br />
        {token}
      </Text>
      <Button href={url} style={button}>
        See the claim
      </Button>
      <Text style={quiet}>
        You are reading this because the answer at {host} is no longer the one it was. ownsi keeps
        reading on its own, and says so again if it changes again.
      </Text>
    </Section>
  </EmailLayout>
)

ClaimProgressEmail.PreviewProps = {
  domain: "acme.com",
  host: "_ownsi-challenge.acme.com",
  token: "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058",
  cause:
    "Your nameservers have the record; the public resolvers are still holding the “does not exist” they cached before you created it.",
  fix: "Nothing to do — that memory expires in about 4 minutes, and ownsi rechecks on its own.",
  url: "https://ownsi.dev/domains/dom_1",
} satisfies ClaimProgressEmailProps

export default ClaimProgressEmail
