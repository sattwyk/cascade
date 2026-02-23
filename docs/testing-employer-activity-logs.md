# Testing Employer Activity Logs

Status note (updated February 23, 2026): this guide reflects the current stream mutation and activity-log implementation in `src/features/streams` and `src/features/organization`.

## Scope

This runbook validates that employee actions produce both:

1. Employee-facing activity entries
2. Employer-facing activity entries (tagged with `metadata.visibleToEmployer = true`)

Covered actions:

- `stream_withdrawn`
- `stream_refresh_activity`

## Source of Truth in Code

- Activity write action: `src/features/organization/server/actions/activity-log.ts`
- Employer dashboard activity page: `src/app/dashboard/@employer/activity/page.tsx`
- Withdrawal mutation logging: `src/features/streams/client/mutations/use-withdraw-mutation.ts`
- Refresh mutation logging: `src/features/streams/client/mutations/use-refresh-activity-mutation.ts`

## Expected Logging Behavior

For each withdrawal/refresh attempt, the client mutation attempts two writes via `createActivityLog(...)`:

1. Employee perspective entry
2. Employer perspective entry

The employer entry is differentiated by:

- `metadata.visibleToEmployer: true`
- Employer-oriented title/description text

Status values are stored in metadata:

- `success`
- `failed`
- `cancelled`

## Manual Verification Flow

### 1) Trigger employee actions

From an employee session on an active stream:

1. Run a successful withdrawal.
2. Trigger one failed or cancelled withdrawal.
3. Run a successful refresh activity.
4. Trigger one failed or cancelled refresh activity.

### 2) Verify in database

Use SQL to verify dual entries exist.

```sql
SELECT
  id,
  activity_type,
  title,
  description,
  actor_type,
  actor_address,
  occurred_at,
  metadata->>'status' AS status,
  metadata->>'visibleToEmployer' AS visible_to_employer,
  metadata->>'streamAddress' AS stream_address
FROM organization_activity
WHERE activity_type IN ('stream_withdrawn', 'stream_refresh_activity')
ORDER BY occurred_at DESC
LIMIT 50;
```

You should see pairs for each action:

- One row with `visible_to_employer` null/false (employee-facing)
- One row with `visible_to_employer = true` (employer-facing)

### 3) Verify in dashboard UI

There is no `/api/activity-log` route in the current app.

Use the activity page rendered by:

- `src/app/dashboard/@employer/activity/page.tsx`

Route:

- `/dashboard/activity`
- If disabled, enable feature flag `dashboard_employer_activity_view`.

Expected:

- Employer-facing entries appear with employee-oriented titles such as:
  - `Employee withdrawal`
  - `Employee refreshed activity`
  - `Employee withdrawal failed`
  - `Employee cancelled activity refresh`

## Canonical Event/Title Matrix

### Withdraw (`stream_withdrawn`)

- Success:
  - Employee: `Withdrawal completed`
  - Employer: `Employee withdrawal`
- Failed:
  - Employee: `Withdrawal failed`
  - Employer: `Employee withdrawal failed`
- Cancelled:
  - Employee: `Withdrawal cancelled`
  - Employer: `Employee cancelled withdrawal`

### Refresh (`stream_refresh_activity`)

- Success:
  - Employee: `Activity refreshed`
  - Employer: `Employee refreshed activity`
- Failed:
  - Employee: `Activity refresh failed`
  - Employer: `Employee activity refresh failed`
- Cancelled:
  - Employee: `Activity refresh cancelled`
  - Employer: `Employee cancelled activity refresh`

## Targeted SQL Assertions

Count employer-visible rows:

```sql
SELECT COUNT(*) AS employer_visible_count
FROM organization_activity
WHERE metadata->>'visibleToEmployer' = 'true'
  AND activity_type IN ('stream_withdrawn', 'stream_refresh_activity');
```

Count by status:

```sql
SELECT
  activity_type,
  metadata->>'status' AS status,
  COUNT(*) AS count
FROM organization_activity
WHERE activity_type IN ('stream_withdrawn', 'stream_refresh_activity')
GROUP BY activity_type, metadata->>'status'
ORDER BY activity_type, status;
```

## Debugging Checklist

1. Confirm database is enabled (`DATABASE_URL` is set).
2. Check browser/server logs for:
   - `[withdraw] Failed to log employer-facing withdrawal activity`
   - `[refresh-activity] Failed to log employer-facing refresh activity`
3. Verify the employee/employer context resolves (cookies and organization context).
4. Verify mutation code paths are the current ones under:
   - `src/features/streams/client/mutations/use-withdraw-mutation.ts`
   - `src/features/streams/client/mutations/use-refresh-activity-mutation.ts`

## Pass Criteria

- Every tested withdrawal/refresh attempt produces two activity rows.
- Employer-facing row includes `metadata.visibleToEmployer = true`.
- `metadata.status` matches the actual operation result.
- `/dashboard/activity` shows the expected employer-facing entries.
