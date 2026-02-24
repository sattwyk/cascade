import 'server-only';
import { statsigAdapter, type StatsigUser } from '@flags-sdk/statsig';
import type { Identify } from 'flags';
import { dedupe, flag } from 'flags/next';

const identifyStatsigUser = dedupe((async ({ headers, cookies }) => {
  const userID =
    cookies.get('cascade-user-id')?.value ??
    cookies.get('cascade-wallet')?.value ??
    cookies.get('cascade-user-email')?.value ??
    headers.get('x-cascade-user-id') ??
    headers.get('x-cascade-wallet') ??
    headers.get('x-cascade-user-email') ??
    undefined;
  const visitorID = cookies.get('cascade-visitor-id')?.value ?? headers.get('x-cascade-visitor-id') ?? undefined;

  if (userID && visitorID) {
    return { userID, customIDs: { visitorID } } satisfies StatsigUser;
  }

  if (userID) {
    return { userID } satisfies StatsigUser;
  }

  if (visitorID) {
    return { customIDs: { visitorID } } satisfies StatsigUser;
  }

  return undefined;
}) satisfies Identify<StatsigUser>);

export const landingPageRefreshFlag = flag<boolean, StatsigUser>({
  key: 'landing_page_refresh',
  description: 'Enable refreshed landing page hero copy',
  defaultValue: false,
  identify: identifyStatsigUser,
  adapter: statsigAdapter.featureGate((gate) => gate.value),
  options: [
    { value: false, label: 'Off' },
    { value: true, label: 'On' },
  ],
});

function createDashboardViewFlag(key: string, description: string) {
  return flag<boolean, StatsigUser>({
    key,
    description,
    defaultValue: true,
    identify: identifyStatsigUser,
    adapter: statsigAdapter.featureGate((gate) => gate.value),
    options: [
      { value: false, label: 'Disabled' },
      { value: true, label: 'Enabled' },
    ],
  });
}

export const employerDashboardOverviewViewFlag = createDashboardViewFlag(
  'dashboard_employer_overview_view',
  'Enable employer dashboard overview view',
);
export const employerDashboardStreamsViewFlag = createDashboardViewFlag(
  'dashboard_employer_streams_view',
  'Enable employer dashboard streams views',
);
export const employerDashboardEmployeesViewFlag = createDashboardViewFlag(
  'dashboard_employer_employees_view',
  'Enable employer dashboard employees views',
);
export const employerDashboardStatusViewFlag = createDashboardViewFlag(
  'dashboard_employer_status_view',
  'Enable employer dashboard status view',
);
export const employerDashboardTemplatesViewFlag = createDashboardViewFlag(
  'dashboard_employer_templates_view',
  'Enable employer dashboard templates view',
);
export const employerDashboardTokenAccountsViewFlag = createDashboardViewFlag(
  'dashboard_employer_token_accounts_view',
  'Enable employer dashboard token accounts view',
);
export const employerDashboardReportsViewFlag = createDashboardViewFlag(
  'dashboard_employer_reports_view',
  'Enable employer dashboard reports view',
);
export const employerDashboardActivityViewFlag = createDashboardViewFlag(
  'dashboard_employer_activity_view',
  'Enable employer dashboard activity view',
);
export const employerDashboardAuditViewFlag = createDashboardViewFlag(
  'dashboard_employer_audit_view',
  'Enable employer dashboard audit view',
);
export const employerDashboardSettingsViewFlag = createDashboardViewFlag(
  'dashboard_employer_settings_view',
  'Enable employer dashboard settings view',
);
export const employerDashboardContactViewFlag = createDashboardViewFlag(
  'dashboard_employer_contact_view',
  'Enable employer dashboard contact view',
);
export const employerDashboardHelpViewFlag = createDashboardViewFlag(
  'dashboard_employer_help_view',
  'Enable employer dashboard help view',
);

export const employeeDashboardOverviewViewFlag = createDashboardViewFlag(
  'dashboard_employee_overview_view',
  'Enable employee dashboard overview view',
);
export const employeeDashboardStreamsViewFlag = createDashboardViewFlag(
  'dashboard_employee_streams_view',
  'Enable employee dashboard streams view',
);
export const employeeDashboardHistoryViewFlag = createDashboardViewFlag(
  'dashboard_employee_history_view',
  'Enable employee dashboard history view',
);
export const employeeDashboardProfileViewFlag = createDashboardViewFlag(
  'dashboard_employee_profile_view',
  'Enable employee dashboard profile view',
);
export const employeeDashboardHelpViewFlag = createDashboardViewFlag(
  'dashboard_employee_help_view',
  'Enable employee dashboard help view',
);
