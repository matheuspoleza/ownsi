import { Button, Link, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"

export interface MagicLinkEmailProps {
  url: string
  expiresInMinutes: number
}

const heading = {
  fontSize: "22px",
  fontWeight: 600,
  lineHeight: "30px",
  margin: "0 0 12px",
}

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 24px",
}

const button = {
  backgroundColor: "#0a0a0a",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 500,
  padding: "12px 20px",
  textDecoration: "none",
}

const fallback = {
  color: "#737373",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "24px 0 0",
  wordBreak: "break-all" as const,
}

export const MagicLinkEmail = ({ url, expiresInMinutes }: MagicLinkEmailProps) => (
  <EmailLayout preview="Your sign-in link for ownsi">
    <Section>
      <Text style={heading}>Sign in to ownsi</Text>
      <Text style={paragraph}>
        This link signs you in and expires in {expiresInMinutes} minutes. If you did not ask for it,
        nothing happened — you can ignore this email.
      </Text>
      <Button href={url} style={button}>
        Sign in
      </Button>
      <Text style={fallback}>
        Or paste this into your browser: <Link href={url}>{url}</Link>
      </Text>
    </Section>
  </EmailLayout>
)
