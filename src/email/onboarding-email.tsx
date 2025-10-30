import * as React from 'react';

import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';

interface OnboardingEmailTemplateProps {
  name: string;
  code: string;
  otpTtlMinutes: number;
}

const fontFamily = "'Geist', 'Helvetica Neue', Arial, sans-serif";

export function OnboardingEmailTemplate({ name, code, otpTtlMinutes }: OnboardingEmailTemplateProps) {
  const friendlyName = name || 'there';

  return (
    <Html>
      <Head />
      <Preview>Your Cascade verification code: {code}</Preview>
      <Body style={{ backgroundColor: '#f5f5f5', fontFamily, margin: 0, padding: '32px 0' }}>
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '0 24px',
          }}
        >
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e4e4e7',
              boxShadow: '0px 12px 24px rgba(15, 23, 42, 0.08)',
              overflow: 'hidden',
            }}
          >
            <Section style={{ padding: '32px' }}>
              <Text style={{ margin: '0 0 12px', fontSize: '18px', color: '#0f172a', fontWeight: 600 }}>
                Hey {friendlyName},
              </Text>
              <Text style={{ margin: '0 0 20px', fontSize: '15px', color: '#334155', lineHeight: '1.6' }}>
                Use the verification code below to continue setting up your Cascade employer account:
              </Text>
              <Section
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '24px',
                  textAlign: 'center' as const,
                  margin: '24px 0',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              >
                <Text
                  style={{
                    fontSize: '32px',
                    fontWeight: 600,
                    letterSpacing: '8px',
                    margin: 0,
                    color: '#111827',
                    fontFamily: "'Geist Mono', 'Courier New', monospace",
                  }}
                >
                  {code}
                </Text>
              </Section>
              <Text style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                This code expires in {otpTtlMinutes} minutes.
              </Text>
              <Text style={{ margin: '0', fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                If you did not request this code, you can safely ignore this message.
              </Text>
            </Section>
            <Hr style={{ borderColor: '#e2e8f0', margin: 0 }} />
            <Section style={{ padding: '24px 32px' }}>
              <Text style={{ margin: '0 0 8px', fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>
                Having trouble?
              </Text>
              <Text style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                If you need assistance, reach out to our support team.
              </Text>
            </Section>
          </Section>
          <Text style={{ margin: '24px 0 0', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
            © {new Date().getFullYear()} Cascade · Payroll without borders
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
