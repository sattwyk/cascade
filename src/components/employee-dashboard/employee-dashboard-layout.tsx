'use client';

import type React from 'react';
import { useMemo } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Building2, FileText, LayoutDashboard, User } from 'lucide-react';

import { useSolana } from '@/components/solana/use-solana';
import { Button } from '@/components/ui/button';
import { WalletDropdown } from '@/components/wallet-dropdown';
import { useEmployeeDashboardOverviewQuery } from '@/features/employee-dashboard/data-access/use-employee-dashboard-overview-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import { ActivityWarningBanner } from './activity-warning-banner';

interface EmployeeDashboardLayoutProps {
  children: React.ReactNode;
}

export function EmployeeDashboardLayout({ children }: EmployeeDashboardLayoutProps) {
  const isMobile = useIsMobile();
  const { connected } = useSolana();
  const pathname = usePathname();
  const { data: overview } = useEmployeeDashboardOverviewQuery();

  const organizationName = overview?.organization?.name ?? '—';

  const activityInfo = useMemo(() => {
    if (!overview?.activity.lastActivityAt || overview.activity.daysUntilEmployerWithdrawal == null) {
      return null;
    }

    try {
      return {
        lastActivityDate: new Date(overview.activity.lastActivityAt),
        daysUntilWithdrawal: overview.activity.daysUntilEmployerWithdrawal,
      };
    } catch (error) {
      console.warn('[employee-dashboard] Failed to parse last activity date', error);
      return null;
    }
  }, [overview]);

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard/history',
      label: 'Payment History',
      icon: FileText,
    },
    {
      href: '/dashboard/profile',
      label: 'Profile',
      icon: User,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left side - Organization Context */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden flex-col text-left text-sm transition-colors hover:text-foreground sm:inline-flex"
            >
              <span className="text-xs tracking-wider text-muted-foreground uppercase">Cascade</span>
              <span className="font-semibold text-foreground">Employee Dashboard</span>
            </Link>

            <div className="hidden h-6 w-px bg-border sm:block" />

            <div className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/40 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Organization</span>
                <span className="text-sm font-semibold">{organizationName}</span>
              </div>
            </div>
          </div>

          {/* Center - Navigation (desktop) */}
          {!isMobile && (
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant="ghost" size="sm" className={cn('gap-2', isActive && 'bg-muted')}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <WalletDropdown />
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobile && (
          <div className="border-t border-border">
            <nav className="flex items-center justify-around px-4 py-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className="flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn('h-auto w-full flex-col gap-1 py-2', isActive && 'bg-muted')}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-xs">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Activity Warning Banner - only show when wallet is connected */}
          {connected && activityInfo && activityInfo.daysUntilWithdrawal <= 7 && (
            <div className="mb-6">
              <ActivityWarningBanner
                lastActivityDate={activityInfo.lastActivityDate}
                daysUntilWithdrawal={activityInfo.daysUntilWithdrawal}
              />
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
