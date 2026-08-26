import { Button, Link, Section, Text } from "@react-email/components"
import { EmailLayout } from "../layout.tsx"
import { button, heading, paragraph, quiet } from "../styles.ts"

export interface MagicLinkEmailProps {
  url: string
  expiresInMinutes: number
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
      <Text style={quiet}>
        Or paste this into your browser: <Link href={url}>{url}</Link>
      </Text>
    </Section>
  </EmailLayout>
)

MagicLinkEmail.PreviewProps = {
  url: "https://ownsi.dev/api/auth/magic-link/verify?token=ml_9f3a1c7d5e2b48a0",
  expiresInMinutes: 10,
} satisfies MagicLinkEmailProps

export default MagicLinkEmail
