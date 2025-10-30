import * as React from 'react';

import { Body, Button, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';

interface EmployeeInviteEmailTemplateProps {
  employeeName: string;
  organizationName: string;
  inviteUrl: string;
  expiresAt: Date;
}

const fontFamily = "'Geist', 'Helvetica Neue', Arial, sans-serif";

function formatExpiresAt(date: Date) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function EmployeeInviteEmailTemplate({
  employeeName,
  organizationName,
  inviteUrl,
  expiresAt,
}: EmployeeInviteEmailTemplateProps) {
  const friendlyName = employeeName || 'there';
  const friendlyOrg = organizationName || 'your employer';

  return (
    <Html>
      <Head />
      <Preview>{friendlyOrg} invited you to join Cascade</Preview>
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
                {friendlyOrg} would like you to activate your Cascade account so you can receive real-time payroll and
                manage your stream. Click the button below to accept the invitation.
              </Text>
              <Button
                href={inviteUrl}
                style={{
                  backgroundColor: '#111827',
                  borderRadius: '9999px',
                  color: '#ffffff',
                  display: 'inline-block',
                  fontSize: '15px',
                  fontWeight: 600,
                  padding: '14px 28px',
                  textDecoration: 'none',
                }}
              >
                Accept invitation
              </Button>
              <Text style={{ margin: '24px 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                This link expires {formatExpiresAt(expiresAt)}. If it stops working, ask your employer to send a new
                invite.
              </Text>
            </Section>
            <Hr style={{ borderColor: '#e2e8f0', margin: 0 }} />
            <Section style={{ padding: '24px 32px' }}>
              <Text style={{ margin: '0 0 8px', fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>
                Having trouble?
              </Text>
              <Text style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                Copy and paste this link into your browser:
                <br />
                <span style={{ color: '#111827', wordBreak: 'break-all' }}>{inviteUrl}</span>
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
