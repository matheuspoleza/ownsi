import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import type { ReactNode } from "react"

export interface EmailLayoutProps {
  preview: string
  children: ReactNode
}

const page = {
  backgroundColor: "#ffffff",
  color: "#0a0a0a",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
}

const container = {
  margin: "0 auto",
  padding: "48px 24px",
  maxWidth: "480px",
}

const rule = {
  borderColor: "#e5e5e5",
  margin: "40px 0 24px",
}

const footer = {
  color: "#737373",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
}

const INTER_WOFF2 =
  "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html lang="en">
    <Head>
      <Font
        fontFamily="Inter"
        fallbackFontFamily="Helvetica"
        webFont={{ url: INTER_WOFF2, format: "woff2" }}
        fontWeight={400}
        fontStyle="normal"
      />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={page}>
      <Container style={container}>
        {children}
        <Section>
          <Hr style={rule} />
          <Text style={footer}>ownsi — you own the domain, not the platform.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)
