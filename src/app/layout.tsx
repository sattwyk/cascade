import type React from 'react';

import type { Metadata } from 'next';

import { Analytics } from '@vercel/analytics/next';

import './globals.css';

import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google';

import { AppProviders } from '@/components/app-providers';
import { ReactScan } from '@/components/react-scan';
import { Toaster } from '@/components/ui/sonner';

// Initialize fonts
const _geist = Geist({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});
const _geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});
const _sourceSerif_4 = Source_Serif_4({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'Cascade Dashboard',
  description: 'Manage your payment streams with Cascade',
  generator: 'Cascade',
  applicationName: 'Cascade Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <ReactScan />
      <body className={`font-sans antialiased`}>
        <AppProviders>
          {children}
          <Toaster />
          <Analytics />
        </AppProviders>
      </body>
    </html>
  );
}
