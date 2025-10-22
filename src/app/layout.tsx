import React from 'react';

import type { Metadata } from 'next';

import { AppLayout } from '@/components/app-layout';
import { AppProviders } from '@/components/app-providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Cascade',
  description: 'The Hourly Payroll Platform',
};

const links: { label: string; path: string }[] = [
  // More links...
  { label: 'Home', path: '/' },
  { label: 'Account', path: '/account' },
  { label: 'Cascade Program', path: '/cascade' },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`}>
        <AppProviders>
          <AppLayout links={links}>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  );
}

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};
