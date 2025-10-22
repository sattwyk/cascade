'use client';

import React from 'react';

import { AccountUiChecker } from '@/features/account/ui/account-ui-checker';
import { ClusterUiChecker } from '@/features/cluster/ui/cluster-ui-checker';

import { AppFooter } from './app-footer';
import { AppHeader } from './app-header';
import { ThemeProvider } from './theme-provider';
import { Toaster } from './ui/sonner';

export function AppLayout({
  children,
  links,
}: {
  children: React.ReactNode;
  links: { label: string; path: string }[];
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="flex min-h-screen flex-col">
        <AppHeader links={links} />
        <main className="container mx-auto flex-grow p-4">
          <ClusterUiChecker>
            <AccountUiChecker />
          </ClusterUiChecker>
          {children}
        </main>
        <AppFooter />
      </div>
      <Toaster closeButton />
    </ThemeProvider>
  );
}
