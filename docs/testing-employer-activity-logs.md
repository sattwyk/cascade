# Testing Employer Activity Logs

## Overview

As of the latest implementation, both withdrawal and refresh-activity operations now create **dual activity logs**:

1. Employee-facing log (for employee dashboard)
2. Employer-facing log (for employer dashboard)

---

## How to Verify

### Step 1: Perform a Withdrawal

1. Navigate to employee dashboard
2. Click "Withdraw" on any active stream
3. Enter an amount and confirm
4. Sign the transaction in your wallet

### Step 2: Check Database Logs

```sql
-- View all withdrawal activities
SELECT
  id,
  title,
  description,
  actor_type,
  actor_address,
  occurred_at,
  metadata->'visibleToEmployer' as employer_visible,
  metadata->'status' as status,
  metadata->'amount' as amount
FROM organization_activity
WHERE activity_type = 'stream_withdrawn'
ORDER BY occurred_at DESC
LIMIT 10;
```

**Expected Results**: For each withdrawal, you should see **2 rows**:

| title                | description                                | employer_visible | status  |
| -------------------- | ------------------------------------------ | ---------------- | ------- |
| Withdrawal completed | You withdrew 50.00 tokens                  | null             | success |
| Employee withdrawal  | Employee withdrew 50.00 tokens from stream | true             | success |

---

### Step 3: View in Employer Dashboard

**Option A: Using the API endpoint**

```bash
curl http://localhost:3000/api/activity-log \
  -H "Cookie: cascade-user-email=employer@example.com"
```

**Option B: Navigate to employer dashboard**

1. Sign in as employer
2. Go to Activity Feed (usually at `/dashboard/activity`)
3. Look for entries with:
   - Title: "Employee withdrawal"
   - Description: "Employee withdrew X tokens from stream"

---

## Activity Log Schema

### Employee-Facing Log

```json
{
  "id": "uuid-1",
  "organizationId": "org-uuid",
  "streamId": "stream-uuid",
  "employeeId": "employee-uuid",
  "actorType": "employee",
  "actorAddress": "EmployeeWalletAddress...",
  "activityType": "stream_withdrawn",
  "title": "Withdrawal completed",
  "description": "You withdrew 50.00 tokens",
  "signature": "TransactionSignature...",
  "occurredAt": "2025-10-31T12:34:56Z",
  "metadata": {
    "amount": 50.0,
    "streamAddress": "StreamPDA...",
    "signature": "TransactionSignature...",
    "actor": "employee",
    "status": "success"
  }
}
```

### Employer-Facing Log

```json
{
  "id": "uuid-2",
  "organizationId": "org-uuid",
  "streamId": "stream-uuid",
  "employeeId": "employee-uuid",
  "actorType": "employee", // Still employee, but visible to employer
  "actorAddress": "EmployeeWalletAddress...",
  "activityType": "stream_withdrawn",
  "title": "Employee withdrawal",
  "description": "Employee withdrew 50.00 tokens from stream",
  "signature": "TransactionSignature...",
  "occurredAt": "2025-10-31T12:34:56Z",
  "metadata": {
    "amount": 50.0,
    "streamAddress": "StreamPDA...",
    "signature": "TransactionSignature...",
    "actor": "employee",
    "visibleToEmployer": true, // 👈 Key differentiator
    "status": "success"
  }
}
```

---

## All Activity Types Covered

### ✅ Withdrawal Success

- **Employee sees**: "Withdrawal completed" / "You withdrew X tokens"
- **Employer sees**: "Employee withdrawal" / "Employee withdrew X tokens from stream"

### ✅ Withdrawal Failed

- **Employee sees**: "Withdrawal failed" / [error message]
- **Employer sees**: "Employee withdrawal failed" / "Employee withdrawal attempt failed: [error]"

### ✅ Withdrawal Cancelled

- **Employee sees**: "Withdrawal cancelled"
- **Employer sees**: "Employee cancelled withdrawal" / "Employee cancelled a withdrawal attempt of X tokens"

### ✅ Refresh Activity Success

- **Employee sees**: "Activity refreshed" / "You refreshed your activity timer"
- **Employer sees**: "Employee refreshed activity" / "Employee confirmed they are still actively working"

### ✅ Refresh Activity Failed

- **Employee sees**: "Activity refresh failed" / [error message]
- **Employer sees**: "Employee activity refresh failed" / [error]

### ✅ Refresh Activity Cancelled

- **Employee sees**: "Activity refresh cancelled"
- **Employer sees**: "Employee cancelled activity refresh" / "Employee cancelled an activity refresh attempt"

---

## Filtering Activity Logs

### For Employee Dashboard

```typescript
// Only show employee-facing activities (no visibleToEmployer flag)
const employeeActivities = allActivities.filter((a) => !a.metadata?.visibleToEmployer);
```

### For Employer Dashboard

```typescript
// Show employer-facing activities (has visibleToEmployer: true)
const employerActivities = allActivities.filter((a) => a.metadata?.visibleToEmployer === true);
```

### Alternative: Use Separate Queries

```typescript
// Employee query
const { data: employeeActivity } = useQuery({
  queryKey: ['employee-activity', employeeId],
  queryFn: () => getEmployeeActivity(employeeId),
});

// Employer query
const { data: organizationActivity } = useQuery({
  queryKey: ['organization-activity', organizationId],
  queryFn: () => getOrganizationActivity(organizationId),
});
```

---

## Status Values

Each activity log includes a `status` field in metadata:

- **`success`**: Operation completed successfully
- **`failed`**: Operation failed due to error
- **`cancelled`**: User cancelled the operation

This allows filtering by status:

```typescript
// Show only successful withdrawals
const successfulWithdrawals = activities.filter(
  (a) => a.activityType === 'stream_withdrawn' && a.metadata?.status === 'success',
);

// Show all failed operations
const failures = activities.filter((a) => a.metadata?.status === 'failed');
```

---

## UI Considerations

### Employee Dashboard Activity Feed

```tsx
<ActivityList>
  {employeeActivities.map((activity) => (
    <ActivityItem key={activity.id}>
      <ActivityIcon type={activity.activityType} status={activity.metadata.status} />
      <div>
        <h4>{activity.title}</h4>
        <p>{activity.description}</p>
        <time>{formatDate(activity.occurredAt)}</time>
        {activity.signature && <ExplorerLink signature={activity.signature} />}
      </div>
    </ActivityItem>
  ))}
</ActivityList>
```

### Employer Dashboard Activity Feed

```tsx
<ActivityList>
  {employerActivities.map((activity) => (
    <ActivityItem key={activity.id}>
      <ActivityIcon type={activity.activityType} status={activity.metadata.status} />
      <div>
        <h4>{activity.title}</h4>
        <p>{activity.description}</p>
        <time>{formatDate(activity.occurredAt)}</time>

        {/* Show employee name if available */}
        {activity.employeeId && <Badge>Employee: {getEmployeeName(activity.employeeId)}</Badge>}

        {/* Show transaction link */}
        {activity.signature && <ExplorerLink signature={activity.signature} />}

        {/* Show status badge */}
        <StatusBadge status={activity.metadata.status} />
      </div>
    </ActivityItem>
  ))}
</ActivityList>
```

---

## Testing Checklist

- [ ] **Withdrawal Success**
  - [ ] Employee log created
  - [ ] Employer log created
  - [ ] Both have correct status: "success"
  - [ ] Employer log has `visibleToEmployer: true`
  - [ ] Signature recorded in both

- [ ] **Withdrawal Failed**
  - [ ] Employee log created with error message
  - [ ] Employer log created with error message
  - [ ] Both have status: "failed"
  - [ ] Error message captured

- [ ] **Withdrawal Cancelled**
  - [ ] Employee log created
  - [ ] Employer log created
  - [ ] Both have status: "cancelled"
  - [ ] No error message (expected)

- [ ] **Refresh Activity Success**
  - [ ] Employee log created
  - [ ] Employer log created
  - [ ] Both have status: "success"

- [ ] **Refresh Activity Failed**
  - [ ] Employee log created with error
  - [ ] Employer log created with error
  - [ ] Both have status: "failed"

- [ ] **Refresh Activity Cancelled**
  - [ ] Employee log created
  - [ ] Employer log created
  - [ ] Both have status: "cancelled"

---

## Debugging Tips

### If you don't see employer logs:

1. **Check database connection**

   ```bash
   echo $DATABASE_URL
   ```

2. **Verify logs are being created**

   ```typescript
   // Add temporary logging
   const result = await createActivityLog({...});
   console.log('Activity log created:', result);
   ```

3. **Check for errors in server logs**

   ```bash
   # Look for these messages:
   # "[withdraw] Failed to log employer-facing withdrawal activity"
   # "[refresh-activity] Failed to log employer-facing refresh activity"
   ```

4. **Query database directly**

   ```sql
   SELECT COUNT(*)
   FROM organization_activity
   WHERE metadata->>'visibleToEmployer' = 'true';
   ```

5. **Verify `createActivityLog` is being called twice**
   - Add breakpoints in `use-withdraw-mutation.ts` at lines where `createActivityLog` is called
   - Should see 2 calls per successful operation

---

## Performance Considerations

Each withdrawal/refresh creates **2 activity logs**. For high-volume systems:

### Option 1: Batch Inserts

```typescript
// Instead of 2 separate calls:
await Promise.all([createActivityLog(employeeLog), createActivityLog(employerLog)]);

// Could batch:
await createActivityLogs([employeeLog, employerLog]);
```

### Option 2: Use Database Triggers

```sql
-- Auto-create employer log when employee log inserted
CREATE OR REPLACE FUNCTION create_employer_activity_mirror()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata->>'visibleToEmployer' IS NULL THEN
    INSERT INTO organization_activity (...)
    VALUES (
      NEW.organization_id,
      NEW.stream_id,
      -- ... derive employer-facing fields
      jsonb_set(NEW.metadata, '{visibleToEmployer}', 'true'::jsonb)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mirror_activity_to_employer
AFTER INSERT ON organization_activity
FOR EACH ROW
EXECUTE FUNCTION create_employer_activity_mirror();
```

### Option 3: Lazy Loading

```typescript
// Don't create logs immediately - queue them
await queueActivityLog(employeeLog);
await queueActivityLog(employerLog);

// Background worker processes queue
setInterval(async () => {
  const batch = await getQueuedLogs(100);
  await bulkInsertActivityLogs(batch);
}, 5000);
```

---

## Future Enhancements

1. **Rich Notifications**
   - Email employer when large withdrawal occurs
   - Slack/Discord webhook integration
   - In-app notifications

2. **Analytics Dashboard**
   - Total withdrawals by employee
   - Average withdrawal amount
   - Peak withdrawal times
   - Withdrawal frequency trends

3. **Activity Search & Filters**
   - Filter by employee
   - Filter by date range
   - Filter by amount range
   - Filter by status (success/failed/cancelled)

4. **Export to CSV**
   - Download activity history
   - Include all metadata
   - Format for accounting software

5. **Real-time Updates**
   - WebSocket notifications
   - Live activity feed
   - Push notifications
