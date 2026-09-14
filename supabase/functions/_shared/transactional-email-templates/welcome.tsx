/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WelcomeEmailProps {
  siteName?: string
  siteUrl?: string
  name?: string
}

const ERGA_INK = '#181516'
const ERGA_CREAM = '#F2F0EF'
const ERGA_MUTED = '#4A4A4F'
const ERGA_HAIRLINE = 'rgba(24, 21, 22, 0.12)'

const WelcomeEmail = ({
  siteName = 'Erga',
  siteUrl = 'https://erga-learning.app',
  name,
}: WelcomeEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Benvenuto su Erga: il tuo studio comincia qui</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={hero}>
          <Text style={logo}>{siteName}</Text>
          <Heading style={h1}>
            {name ? `Ciao ${name},` : 'Ciao,'}
          </Heading>
          <Text style={lead}>
            Benvenuto nel posto dove il tuo materiale diventa un percorso.
          </Text>
        </Section>

        <Section style={card}>
          <Text style={text}>
            Erga trasforma PDF, foto di appunti e ricerche web in mini-lezioni,
            esercizi e un piano di studio fatto su misura per te.
          </Text>
          <Text style={text}>
            Ecco tre modi per iniziare subito:
          </Text>

          <Section style={steps}>
            <Step number={1} title="Carica il tuo materiale">
              PDF, foto o appunti: basta un file per partire.
            </Step>
            <Step number={2} title="Scegli un argomento">
              Oppure cerca sul web e lascia che l'AI costruisca il percorso.
            </Step>
            <Step number={3} title="Segui le lezioni">
              Mini-lezioni interattive, esercizi e verifiche ti aspettano.
            </Step>
          </Section>

          <Button className="dm-btn" style={button} href={siteUrl}>
            Inizia a studiare
          </Button>
        </Section>

        <Text style={footer}>
          Hai domande? Scrivi a{' '}
          <Link href="mailto:hello@erga-learning.app" style={link}>
            hello@erga-learning.app
          </Link>
        </Text>
        <Text style={smallFooter}>
          Se non hai creato un account su {siteName}, puoi ignorare questa email.
        </Text>
      </Container>
    </Body>
  </Html>
)

function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <Section style={step}>
      <Section style={stepNumberWrap}>
        <Text style={stepNumber}>{number}</Text>
      </Section>
      <Section style={stepBody}>
        <Text style={stepTitle}>{title}</Text>
        <Text style={stepDesc}>{children}</Text>
      </Section>
    </Section>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: 'Benvenuto su Erga',
  displayName: 'Welcome email',
  previewData: {
    siteName: 'Erga',
    siteUrl: 'https://erga-learning.app',
    name: 'Alessandro',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: ERGA_CREAM,
  fontFamily: '"Plus Jakarta Sans", "Montserrat", Arial, sans-serif',
  color: ERGA_INK,
  margin: 0,
  padding: 0,
}

const container = {
  backgroundColor: ERGA_CREAM,
  padding: '32px 24px',
  maxWidth: '520px',
}

const hero = {
  textAlign: 'left' as const,
  marginBottom: '28px',
}

const logo = {
  fontFamily: '"Radja", Georgia, serif',
  fontSize: '18px',
  color: ERGA_INK,
  margin: '0 0 24px',
  letterSpacing: '-0.02em',
}

const h1 = {
  fontFamily: '"Radja", Georgia, serif',
  fontSize: '28px',
  fontWeight: 400,
  color: ERGA_INK,
  margin: '0 0 12px',
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
}

const lead = {
  fontSize: '16px',
  color: ERGA_MUTED,
  margin: 0,
  lineHeight: 1.5,
}

const card = {
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  padding: '28px',
  border: `1px solid ${ERGA_HAIRLINE}`,
}

const text = {
  fontSize: '15px',
  color: ERGA_INK,
  lineHeight: 1.6,
  margin: '0 0 18px',
}

const steps = {
  margin: '24px 0',
}

const step = {
  display: 'table' as const,
  width: '100%',
  marginBottom: '16px',
}

const stepNumberWrap = {
  display: 'table-cell' as const,
  verticalAlign: 'top' as const,
  width: '36px',
}

const stepNumber = {
  display: 'inline-block' as const,
  width: '28px',
  height: '28px',
  lineHeight: '28px',
  borderRadius: '9999px',
  backgroundColor: ERGA_INK,
  color: ERGA_CREAM,
  fontSize: '13px',
  fontWeight: 600,
  textAlign: 'center' as const,
  margin: 0,
}

const stepBody = {
  display: 'table-cell' as const,
  verticalAlign: 'top' as const,
}

const stepTitle = {
  fontSize: '15px',
  fontWeight: 600,
  color: ERGA_INK,
  margin: '0 0 4px',
}

const stepDesc = {
  fontSize: '14px',
  color: ERGA_MUTED,
  lineHeight: 1.5,
  margin: 0,
}

const button = {
  backgroundColor: ERGA_INK,
  color: ERGA_CREAM,
  fontSize: '15px',
  fontWeight: 600,
  border: `1px solid ${ERGA_INK}`,
  borderRadius: '16px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  marginTop: '8px',
}

const footer = {
  fontSize: '13px',
  color: ERGA_MUTED,
  margin: '28px 0 8px',
  lineHeight: 1.5,
}

const smallFooter = {
  fontSize: '12px',
  color: '#999999',
  margin: 0,
}

const link = {
  color: ERGA_INK,
  textDecoration: 'underline',
}

const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #F2F0EF !important; color: #181516 !important; border-color: #F2F0EF !important; }
  }
  [data-ogsc] .dm-btn { background-color: #F2F0EF !important; color: #181516 !important; border-color: #F2F0EF !important; }
  [data-ogsb] .dm-btn { background-color: #F2F0EF !important; color: #181516 !important; border-color: #F2F0EF !important; }
`
