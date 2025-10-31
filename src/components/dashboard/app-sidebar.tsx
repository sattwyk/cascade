'use client';

import { useCallback, useMemo } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Activity,
  BarChart3,
  ChevronLeft,
  FileText,
  FolderGit2,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  UserCheck2,
  UserMinus,
  Users2,
  type LucideIcon,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { useNotificationCountsQuery } from '@/features/dashboard/data-access/use-notification-counts-query';

type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  alert?: boolean;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const { data: notificationCounts } = useNotificationCountsQuery();

  const handleNavigate = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  // Build navigation with dynamic notification counts
  const navigation: NavigationSection[] = useMemo(
    () => [
      {
        title: 'Organization',
        items: [
          {
            title: 'Overview',
            href: '/dashboard',
            icon: LayoutDashboard,
          },
          {
            title: 'Activity Log',
            href: '/dashboard/activity',
            icon: Activity,
          },
          {
            title: 'Audit Trail',
            href: '/dashboard/audit',
            icon: ShieldCheck,
            alert: notificationCounts?.unreadAuditItems ? notificationCounts.unreadAuditItems > 0 : false,
          },
        ],
      },
      {
        title: 'Streams',
        items: [
          {
            title: 'All Streams',
            href: '/dashboard/streams',
            icon: FolderGit2,
          },
          {
            title: 'Drafts',
            href: '/dashboard/streams/drafts',
            icon: FileText,
            badge: notificationCounts?.draftStreams || undefined,
          },
        ],
      },
      {
        title: 'Employees',
        items: [
          {
            title: 'Directory',
            href: '/dashboard/employees',
            icon: Users2,
          },
          {
            title: 'Invitations',
            href: '/dashboard/employees/invitations',
            icon: UserCheck2,
            badge: notificationCounts?.pendingInvitations || undefined,
          },
          {
            title: 'Archived',
            href: '/dashboard/employees/archived',
            icon: UserMinus,
          },
        ],
      },
      {
        title: 'Reports',
        items: [
          {
            title: 'Reports',
            href: '/dashboard/reports',
            icon: BarChart3,
          },
        ],
      },
    ],
    [notificationCounts],
  );

  return (
    <Sidebar collapsible="icon" className="relative">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-6">
        <div className="relative flex w-full items-center gap-2">
          <Link
            href="/dashboard"
            prefetch
            className="flex flex-1 items-center gap-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:border group-data-[collapsible=icon]:border-sidebar-border group-data-[collapsible=icon]:bg-sidebar"
            aria-label="Cascade employer dashboard"
            onClick={handleNavigate}
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-lg font-semibold text-sidebar-primary-foreground group-data-[collapsible=icon]:h-full group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:rounded-md">
              C
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">Cascade</span>
              <span className="text-xs text-sidebar-foreground/70">Employer portal</span>
            </div>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  // Only show badge if there's a value (number > 0 or string)
                  const shouldShowBadge =
                    item.badge !== undefined &&
                    (typeof item.badge === 'string' || (typeof item.badge === 'number' && item.badge > 0));

                  return (
                    <SidebarMenuItem key={item.title} className="relative">
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link
                          href={item.href}
                          prefetch
                          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
                          onClick={handleNavigate}
                        >
                          <item.icon className="size-5 shrink-0 group-data-[collapsible=icon]:size-5" />
                          <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                      {shouldShowBadge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                      {item.alert && (
                        <span
                          className="absolute top-2 right-2 size-2 rounded-full bg-destructive group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1"
                          aria-label="Unread notifications"
                        />
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Help & Support">
              <Link
                href="/dashboard/help"
                prefetch
                className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
                onClick={handleNavigate}
              >
                <MessageSquare className="size-5 shrink-0 group-data-[collapsible=icon]:size-5" />
                <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
                  Help & Support
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {!isMobile && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute top-1/2 right-[-18px] z-50 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar shadow-sm transition-all duration-300 ease-in-out hover:bg-sidebar-accent md:flex"
        >
          {state === 'collapsed' ? <ChevronLeft className="size-4 rotate-180" /> : <ChevronLeft className="size-4" />}
        </button>
      )}
    </Sidebar>
  );
}
