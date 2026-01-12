'use client';

import type React from 'react';
import { useCallback, useState, useTransition } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { ChevronDown, ChevronRight, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';

import { useSolana } from '@/components/solana/use-solana';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SidebarSection {
  title: string;
  icon?: React.ReactNode;
  items: Array<{
    id: string;
    label: string;
    badge?: number | string;
    alert?: boolean;
    external?: boolean;
    href: string;
  }>;
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: 'Organization',
    items: [
      { id: 'overview', label: 'Overview', href: '/dashboard' },
      { id: 'activity', label: 'Activity Log', href: '/dashboard/activity' },
      { id: 'audit', label: 'Audit Trail', href: '/dashboard/audit' },
    ],
  },
  {
    title: 'Streams',
    items: [
      { id: 'all-streams', label: 'All Streams', href: '/dashboard/streams' },
      { id: 'drafts', label: 'Drafts', href: '/dashboard/streams/drafts' },
    ],
  },
  {
    title: 'Employees',
    items: [
      { id: 'directory', label: 'Directory', href: '/dashboard/employees' },
      {
        id: 'invitations',
        label: 'Invitations',
        badge: 1,
        href: '/dashboard/employees/invitations',
      },
      {
        id: 'archived',
        label: 'Archived',
        href: '/dashboard/employees/archived',
      },
    ],
  },
  {
    title: 'Tools',
    items: [
      { id: 'reports', label: 'Reports', href: '/dashboard/reports' },
      { id: 'settings', label: 'Settings', href: '/dashboard/settings' },
    ],
  },
];

export function DashboardSidebar({ open, onOpenChange }: DashboardSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Organization', 'Streams']));
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isNavigating, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { connected, disconnect } = useSolana();

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const handleItemClick = (item: SidebarSection['items'][number]) => {
    if (item.external) {
      window.open(item.href, '_blank');
    } else {
      startTransition(() => {
        setPendingHref(item.href);
        router.push(item.href);
      });
      if (isMobile) {
        onOpenChange(false);
      }
    }
  };

  const handleDisconnect = useCallback(async () => {
    if (!connected) return;
    try {
      await Promise.resolve(disconnect());
      toast.success('Wallet disconnected');
      if (isMobile) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to disconnect wallet', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [connected, disconnect, isMobile, onOpenChange]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && open && <div className="fixed inset-0 z-40 bg-black/50" onClick={() => onOpenChange(false)} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-screen w-56 flex-col border-r border-border bg-sidebar transition-transform duration-300 sm:w-60 md:relative md:w-64 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-3 sm:px-4 sm:py-4">
          <h2 className="truncate text-sm font-semibold sm:text-base">Cascade</h2>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 overflow-auto px-2 py-3 sm:py-4">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.title} className="mb-3 sm:mb-4">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent sm:px-3 sm:py-2 sm:text-sm"
              >
                <span className="truncate">{section.title}</span>
                {expandedSections.has(section.title) ? (
                  <ChevronDown className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                )}
              </button>

              {expandedSections.has(section.title) && (
                <div className="mt-1.5 space-y-0.5 sm:mt-2 sm:space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      disabled={isNavigating && pendingHref === item.href}
                      className={cn(
                        'flex w-full items-center justify-between truncate rounded-md px-2 py-1.5 text-xs transition-colors sm:px-3 sm:py-2 sm:text-sm',
                        pathname === item.href || pendingHref === item.href
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent',
                        pendingHref === item.href && 'opacity-80',
                      )}
                      aria-current={pathname === item.href ? 'page' : undefined}
                    >
                      <span className="flex items-center gap-1.5 truncate sm:gap-2">
                        <span className="truncate">{item.label}</span>
                        {item.external && <ExternalLink className="h-3 w-3 shrink-0" />}
                      </span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-1 shrink-0 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      {item.alert && <div className="h-2 w-2 shrink-0 rounded-full bg-destructive" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 sm:p-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-transparent text-xs sm:text-sm"
            onClick={handleDisconnect}
            disabled={!connected}
          >
            Disconnect
          </Button>
        </div>
      </aside>
    </>
  );
}
