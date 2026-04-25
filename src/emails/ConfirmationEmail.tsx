import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ConfirmationEmailProps {
  userFirstname?: string;
  confirmationUrl?: string;
}

export const ConfirmationEmail = ({
  userFirstname = 'Athlete',
  confirmationUrl = 'https://irontrack.ai/confirm?token=123',
}: ConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to IronTrack AI - Verify your email</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={logoText}>
              IRON<span style={{ color: '#22c55e' }}>TRACK</span> <span style={{ color: '#38bdf8' }}>AI</span>
            </Text>
          </Section>
          
          <Heading style={heading}>Welcome aboard, {userFirstname}!</Heading>
          
          <Text style={paragraph}>
            You&apos;re incredibly close to unlocking AI-powered form tracking and maximizing your daily gains. Please confirm your email address so we know it&apos;s really you.
          </Text>

          <Section style={btnContainer}>
            <Button style={button} href={confirmationUrl}>
              Verify Email Address
            </Button>
          </Section>

          <Text style={paragraph}>
            If you didn&apos;t sign up for IronTrack AI, you can safely ignore this email. Your account won&apos;t be activated until you verify.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Stay Consistent. Train Hard. Perfect Form.<br />
            © {new Date().getFullYear()} IronTrack AI. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ConfirmationEmail;

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
};

const headerSection = {
  textAlign: 'center' as const,
  marginBottom: '40px',
};

const logoText = {
  color: '#ffffff',
  fontSize: '28px',
  fontFamily: 'Orbitron, sans-serif',
  fontWeight: '800',
  letterSpacing: '2px',
  margin: '0',
};

const heading = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '16px 0',
  textAlign: 'left' as const,
};

const paragraph = {
  color: '#ededed',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#22c55e',
  borderRadius: '8px',
  color: '#000000',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '14px 24px',
  boxShadow: '0 0 25px rgba(34, 197, 94, 0.2)',
};

const hr = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '32px 0 24px',
};

const footer = {
  color: 'rgba(255, 255, 255, 0.4)',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
};
