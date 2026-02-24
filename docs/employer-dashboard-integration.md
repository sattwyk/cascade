# Employer Dashboard Integration Status

Status note (updated February 23, 2026): this document reflects the current refactored implementation under the `src/features` modules.

## Overview

The employer dashboard is now integrated with live program data and server-backed organization/employee/stream actions.
The app no longer relies on the old dashboard/cascade module layout from earlier revisions.

## Completed Integration Areas

### 1) Dashboard state + modal orchestration

- Provider: `src/features/organization/components/layout/employer-dashboard-context.tsx`
- Layout/modal host: `src/features/organization/components/layout/employer-dashboard-layout.tsx`
- Includes stream modals, employee modals, top-up account modal, and selected-stream state.

### 2) Stream data + mutations

- Dashboard streams query: `src/features/streams/client/queries/use-employer-streams-query.ts`
- Stream mutation hooks:
  - `src/features/streams/client/mutations/use-create-stream-mutation.ts`
  - `src/features/streams/client/mutations/use-top-up-stream-mutation.ts`
  - `src/features/streams/client/mutations/use-emergency-withdraw-mutation.ts`
  - `src/features/streams/client/mutations/use-close-stream-mutation.ts`
  - `src/features/streams/client/mutations/use-withdraw-mutation.ts`
  - `src/features/streams/client/mutations/use-refresh-activity-mutation.ts`
- PDA + amount/error helpers: `src/features/streams/client/utils/derive-cascade-pdas.ts`
- Wallet send fallback utility: `src/features/streams/client/utils/use-wallet-ui-sign-and-send-with-fallback.ts`

### 3) Streams UI

- Streams tab: `src/features/streams/components/employer-streams-tab.tsx`
- List/detail/actions:
  - `src/features/streams/components/streams-list.tsx`
  - `src/features/streams/components/stream-detail-drawer.tsx`
  - `src/features/streams/components/stream-action-buttons.tsx`
- Modals:
  - `src/features/streams/components/create-stream-modal.tsx`
  - `src/features/streams/components/top-up-stream-modal.tsx`
  - `src/features/streams/components/emergency-withdraw-modal.tsx`
  - `src/features/streams/components/close-stream-modal.tsx`

### 4) Employee + organization integration

- Employee list/query: `src/features/employees/client/queries/use-employer-employees-query.ts`
- Employee management server actions: `src/features/employees/server/actions/employer-manage-employees.ts`
- Employee tab/components:
  - `src/features/employees/components/employer-employees-tab.tsx`
  - `src/features/employees/components/employer-employee-directory.tsx`
  - `src/features/employees/components/employer-add-employee-modal.tsx`
- Organization context resolution: `src/features/organization/server/actions/organization-context.ts`

### 5) Activity integration

- Activity writes: `src/features/organization/server/actions/activity-log.ts`
- Employer activity page: `src/app/dashboard/@employer/activity/page.tsx`
- Stream-level activity panel: `src/features/streams/components/stream-activity-history.tsx`
- Stream activity query/action:
  - `src/features/streams/client/queries/use-employer-stream-activity-query.ts`
  - `src/features/streams/server/actions/employer-stream-activity.ts`

### 6) Route-level flag gating

- Flags source: `src/core/config/flags.ts`
- Disabled state component: `src/core/ui/feature-flag-disabled.tsx`
- Employer routes implemented under `src/app/dashboard/@employer`.

## Remaining Gaps / Follow-up Work

1. Multi-org context UX still needs an explicit org selector for users with multiple memberships.
2. Stream activity query currently filters in memory after fetching org activity; this should be optimized for scale.
3. Setup progress still mixes server state and local persistence fallback; tighten consistency rules if strict server truth is required.
4. Add frontend integration tests for critical dashboard flows (create/top-up/emergency/close) in addition to current program-level localnet coverage.
5. Improve retry/observability around server-action persistence paths when on-chain tx succeeds but DB recording degrades.

## Validation Commands

```bash
pnpm test
pnpm run anchor-test
pnpm run build
pnpm lint
```
