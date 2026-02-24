# Withdrawal Feature Analysis & Recommendations

Status note (updated February 23, 2026): this is an analysis snapshot, not a strict runbook. It should be read alongside current implementation in `src/features/streams/client/mutations/use-withdraw-mutation.ts` and related server actions.

## Executive Summary

The withdrawal feature is **functionally working** - on-chain transactions succeed and funds transfer correctly. However, there are UX and data consistency issues related to the database sync process.

---

## ✅ What's Working

1. **On-chain Execution**: Withdrawals execute successfully on Solana
2. **Activity Logging**: Both employee and employer activity logs are now created
3. **Error Handling**: User cancellations vs actual errors are properly distinguished
4. **Optimistic Updates**: UI updates immediately when DB is unavailable
5. **Associated Token Account**: Auto-creates ATA if missing

---

## ⚠️ Issues Fixed

### Issue #1: Double Toast (Success + Error)

**Symptom**: Transaction succeeds, shows success toast, then shows error toast

**Root Cause**:

- When stream record doesn't exist in DB yet, `recordEmployeeWithdrawal` returns `stream-not-found`
- Old code wasn't handling all graceful failure reasons consistently

**Fix Applied**:

```typescript
// Now handles 4 graceful degradation scenarios without error toasts:
const gracefulReasons = ['database-disabled', 'stream-not-found', 'identity-required', 'employee-not-found'];
```

### Issue #2: Missing Employer Activity Logs

**Symptom**: Original request specified "create activity for the **employer**" but only employee logs existed

**Fix Applied**:

- Now creates **TWO** activity logs per withdrawal:
  1. Employee-facing: "You withdrew X tokens"
  2. Employer-facing: "Employee withdrew X tokens" (with `visibleToEmployer: true` flag)
- Same pattern applied to both SUCCESS and FAILURE cases
- Also applied to refresh activity feature

---

## 🔍 How Database Updates Work

### Path 1: Full Database Update ✅

**When**:

- `DATABASE_URL` is configured
- Stream exists in `streams` table
- Employee context resolves (cookies/headers present)

**What Happens**:

```typescript
// Updates the streams table
UPDATE streams
SET withdrawn_amount = current + amount,
    last_activity_at = NOW()
WHERE id = streamId;

// Inserts event record
INSERT INTO stream_events (stream_id, event_type, amount, signature, ...)
VALUES (...);

// Inserts activity log (x2 for employee & employer)
INSERT INTO organization_activity (...)
VALUES (...);
```

**Result**: Dashboard updates immediately on refetch

---

### Path 2: Optimistic Update (Degraded Mode) ⚙️

**When**:

- Database disabled OR
- Stream not synced to DB yet OR
- Employee context missing

**What Happens**:

```typescript
// Updates React Query cache in-memory
queryClient.setQueryData(EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY, (previous) => ({
  ...previous,
  streams: previous.streams.map((stream) =>
    stream.id === streamId ? { ...stream, withdrawnAmount: stream.withdrawnAmount + amount } : stream,
  ),
  stats: {
    ...previous.stats,
    availableToWithdraw: Math.max(previous.stats.availableToWithdraw - amount, 0),
  },
}));
```

**Result**: Dashboard updates immediately, but data is LOST on page refresh

---

## 📊 Database Schema Coverage

### Tables Updated on Withdrawal:

1. ✅ **`streams`**: `withdrawn_amount`, `last_activity_at`
2. ✅ **`stream_events`**: Complete audit trail with signatures
3. ✅ **`organization_activity`**: Dual logs (employee + employer perspectives)

### Tables NOT Updated (by design):

- `employees`: Status/metadata unchanged
- `organization_token_accounts`: Balances synced separately
- `alerts`: No automatic alert creation (should you add low-balance alerts?)

---

## 🚀 Recommendations

### High Priority

#### 1. Add Stream Sync Mechanism

**Problem**: stream metadata can become temporarily desynced when create/persist flows do not complete (for example, missing context needed by persistence actions).

**Suggested Solutions**:

**Option A**: Background worker that polls Solana

```typescript
// New file: src/workflows/stream-sync-worker.ts
export async function syncStreamsFromChain() {
  const programs = await fetchProgramAccounts('cascade_program_id');

  for (const stream of programs) {
    await db.insert(streams).values({
      streamAddress: stream.publicKey,
      // ... parse account data
    }).onConflictDoUpdate(...);
  }
}
```

**Option B**: Trigger server-side persistence directly from the create flow

```typescript
// In your create-stream success path
onSuccess: async (result) => {
  await createStreamRecord({
    streamAddress: result.streamAddress,
    vaultAddress: result.vaultAddress,
    employeeId: result.input.employeeId,
    // ... other fields
  });
};
```

#### 2. Add Balance Alerts

**Why**: Employers need to know when vault is running low

```typescript
// After withdrawal, check balance
const remainingBalance = totalDeposited - withdrawnAmount;
const hoursRemaining = remainingBalance / hourlyRate;

if (hoursRemaining < 24) {
  await db.insert(alerts).values({
    organizationId,
    streamId,
    type: 'low_runway',
    severity: hoursRemaining < 8 ? 'critical' : 'high',
    title: `Stream running low: ${hoursRemaining}h remaining`,
  });
}
```

#### 3. Improve Error Messages

**Current**: "We could not find this stream..."
**Better**: Include actionable steps

```typescript
return {
  ok: false,
  reason: 'stream-not-found',
  error: 'Stream data is syncing. Refresh in a few moments or contact support if this persists.',
  retryable: true, // New field
  estimatedSyncTime: '30 seconds', // New field
};
```

---

### Medium Priority

#### 4. Add Withdrawal Limits

**Safety Feature**: Prevent accidental large withdrawals

```typescript
// In recordEmployeeWithdrawal
const MAX_SINGLE_WITHDRAWAL = 1000; // tokens
if (parsed.data.amount > MAX_SINGLE_WITHDRAWAL) {
  return {
    ok: false,
    reason: 'exceeds-limit',
    error: `Single withdrawals are capped at ${MAX_SINGLE_WITHDRAWAL} tokens for security.`,
  };
}
```

#### 5. Add Withdrawal History Pagination

**Current**: Only shows last 5 withdrawals
**Better**: Full paginated history

```typescript
export async function getWithdrawalHistory(streamId: string, page = 1, limit = 20) {
  return db
    .select()
    .from(streamEvents)
    .where(and(eq(streamEvents.streamId, streamId), eq(streamEvents.eventType, 'stream_withdrawn')))
    .orderBy(desc(streamEvents.occurredAt))
    .limit(limit)
    .offset((page - 1) * limit);
}
```

---

### Low Priority (Polish)

#### 6. Add Loading States

```typescript
// Show progress during multi-step process
toast.loading('Creating token account...', { id: 'withdraw' });
// ... create ATA
toast.loading('Submitting withdrawal...', { id: 'withdraw' });
// ... sign transaction
toast.success('Withdrawal complete!', { id: 'withdraw' });
```

#### 7. Add Withdrawal Confirmations

```typescript
// For large amounts, require double confirmation
if (amount > employee.hourlyRate * 40) {
  // More than 1 week's pay
  const confirmed = await showConfirmDialog({
    title: 'Large Withdrawal',
    description: `You're withdrawing ${amount} tokens (~${amount / hourlyRate}h of work). Continue?`,
  });
  if (!confirmed) return;
}
```

#### 8. Add CSV Export

```typescript
export async function exportWithdrawals(streamId: string) {
  const withdrawals = await getWithdrawalHistory(streamId, 1, 10000);
  return convertToCSV(withdrawals, ['Date', 'Amount', 'Signature', 'Status']);
}
```

---

## 🧪 Testing Checklist

### Manual Tests to Run:

- [x] Withdrawal succeeds on-chain
- [x] Success toast appears
- [x] No error toast after success
- [x] Employee activity log created
- [x] Employer activity log created (check with employer dashboard)
- [ ] Dashboard updates immediately (with DB)
- [ ] Dashboard updates optimistically (without DB)
- [ ] Page refresh shows correct balance (with DB)
- [ ] Page refresh loses optimistic update (without DB) - expected
- [ ] Withdrawal fails gracefully when user rejects
- [ ] "Cancelled" status in activity log
- [ ] Actual errors show proper error toast
- [ ] ATA auto-creation works for new tokens

### Integration Tests to Add:

```typescript
describe('Withdrawal Flow', () => {
  it('should update DB when stream exists', async () => {
    // Setup: Create stream in DB
    // Act: Withdraw
    // Assert: DB record updated
  });

  it('should use optimistic update when DB disabled', async () => {
    // Setup: Mock DATABASE_URL = undefined
    // Act: Withdraw
    // Assert: Cache updated, DB unchanged
  });

  it('should log both employee and employer activities', async () => {
    // Act: Withdraw
    // Assert: 2 activity records created
  });
});
```

---

## 📈 Metrics to Track

Consider adding these analytics:

1. **Withdrawal Success Rate**: % of attempts that complete
2. **Average Withdrawal Amount**: Trend over time
3. **Time to First Withdrawal**: From stream creation
4. **DB Sync Lag**: Time between on-chain tx and DB record
5. **Optimistic Update Usage**: % of withdrawals that fell back

---

## 🔐 Security Considerations

### Already Implemented ✅

- On-chain validation (Solana program enforces rules)
- Signer verification (wallet signature required)
- Balance checks (can't withdraw more than available)

### Consider Adding:

- Rate limiting (max 10 withdrawals/hour?)
- IP logging for audit trail
- Email notifications on large withdrawals
- 2FA for withdrawals above threshold

---

## 🎯 Next Steps

1. **Immediate**: Test the fixes deployed in this session
   - Verify no more double-toast
   - Check employer activity logs appear

2. **This Week**: tighten persistence guarantees for create + withdraw paths and monitor desync cases

3. **This Month**: Add balance alerts and withdrawal limits

4. **Future**: Polish UX with loading states, confirmations, CSV export

---

## 💡 Key Takeaway

**The withdrawal feature works correctly on-chain**. The remaining work is about:

- Improving data persistence when DB is available
- Better UX when DB is temporarily unavailable
- Adding safety features and analytics

The dual-activity-log approach you requested is now fully implemented for both success and failure cases. Employers will see comprehensive activity feeds showing all employee actions.
