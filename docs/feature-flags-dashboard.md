# Dashboard Feature Flags Map

Status note (updated February 23, 2026): this map reflects the current dashboard route structure under `src/app/dashboard` and current flags config.

This document maps every dashboard view route to its feature flag key.

All flags are declared in `src/core/config/flags.ts` and evaluated server-side in each route `page.tsx`.

## Defaults

- All dashboard view flags currently default to `true`.
- If a flag is disabled, the page renders the shared disabled state component from `src/core/ui/feature-flag-disabled.tsx`.

## Employer Views

| Route                           | Flag Key                                 |
| ------------------------------- | ---------------------------------------- |
| `/dashboard`                    | `dashboard_employer_overview_view`       |
| `/dashboard/streams`            | `dashboard_employer_streams_view`        |
| `/dashboard/streams/[filter]`   | `dashboard_employer_streams_view`        |
| `/dashboard/employees`          | `dashboard_employer_employees_view`      |
| `/dashboard/employees/[filter]` | `dashboard_employer_employees_view`      |
| `/dashboard/status`             | `dashboard_employer_status_view`         |
| `/dashboard/templates`          | `dashboard_employer_templates_view`      |
| `/dashboard/token-accounts`     | `dashboard_employer_token_accounts_view` |
| `/dashboard/reports`            | `dashboard_employer_reports_view`        |
| `/dashboard/activity`           | `dashboard_employer_activity_view`       |
| `/dashboard/audit`              | `dashboard_employer_audit_view`          |
| `/dashboard/settings`           | `dashboard_employer_settings_view`       |
| `/dashboard/contact`            | `dashboard_employer_contact_view`        |
| `/dashboard/help`               | `dashboard_employer_help_view`           |

## Employee Views

| Route                | Flag Key                           |
| -------------------- | ---------------------------------- |
| `/dashboard`         | `dashboard_employee_overview_view` |
| `/dashboard/streams` | `dashboard_employee_streams_view`  |
| `/dashboard/history` | `dashboard_employee_history_view`  |
| `/dashboard/profile` | `dashboard_employee_profile_view`  |
| `/dashboard/help`    | `dashboard_employee_help_view`     |

## Discovery Endpoint

The flags discovery endpoint exposes all declared flags for Vercel Flags Explorer:

- `src/app/.well-known/vercel/flags/route.ts`

## Statsig Setup Notes

- Provider: `@flags-sdk/statsig`
- Required env for evaluation: `STATSIG_SERVER_API_KEY`
- Optional provider metadata in explorer: `STATSIG_PROJECT_ID`, `STATSIG_CONSOLE_API_KEY`
