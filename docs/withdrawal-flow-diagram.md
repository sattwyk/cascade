# Withdrawal Flow Diagram

Status note (updated February 23, 2026): this diagram reflects current withdrawal handling in `src/features/streams/client/mutations/use-withdraw-mutation.ts`.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EMPLOYEE INITIATES WITHDRAWAL                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Create ATA (if needed)│
                    │  + Withdraw Instruction│
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   User Signs TX        │
                    │   (Wallet Approval)    │
                    └────────┬───────┬───────┘
                             │       │
                  ❌ Reject  │       │ ✅ Approve
                             │       │
                ┌────────────▼       ▼──────────────┐
                │                                   │
                │  CANCELLED PATH                   │  SUCCESS PATH
                │                                   │
                ▼                                   ▼
    ┌──────────────────────┐           ┌──────────────────────┐
    │ Toast: "Cancelled"   │           │ Submit to Solana     │
    └──────────┬───────────┘           └──────────┬───────────┘
               │                                  │
               ▼                                  ▼
    ┌──────────────────────┐           ┌──────────────────────┐
    │ Log Activity:        │           │ ✅ Transaction       │
    │ - Employee: cancel   │           │    Confirmed         │
    │ - Employer: cancel   │           └──────────┬───────────┘
    │ Status: "cancelled"  │                      │
    └──────────────────────┘                      ▼
                                       ┌──────────────────────┐
                                       │ Toast: Success +     │
                                       │ Explorer Link        │
                                       └──────────┬───────────┘
                                                  │
                                       ┌──────────▼───────────┐
                                       │ recordEmployeeWith-  │
                                       │ drawal() Server Call │
                                       └──────────┬───────────┘
                                                  │
                      ┌───────────────────────────┼────────────────────────┐
                      │                           │                        │
                      ▼                           ▼                        ▼
         ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────┐
         │ DB Available & Stream  │  │ DB Disabled OR         │  │ Actual Error       │
         │ Found ✅               │  │ Stream Not Found ⚠️    │  │ (DB Error, etc) ❌ │
         └────────────┬───────────┘  └────────────┬───────────┘  └────────┬───────────┘
                      │                           │                       │
                      ▼                           ▼                       ▼
         ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────┐
         │ UPDATE streams SET:    │  │ No DB Update           │  │ Toast: Error       │
         │ - withdrawn_amount +=  │  │ (Graceful Degradation) │  │ Message            │
         │ - last_activity_at     │  └────────────┬───────────┘  └────────────────────┘
         │                        │               │
         │ INSERT INTO:           │               ▼
         │ - stream_events        │  ┌────────────────────────┐
         │ - org_activity (x2)    │  │ Optimistic Cache Update│
         └────────────┬───────────┘  │ (React Query)          │
                      │              │ - Update balance       │
                      │              │ - Add to history       │
                      │              └────────────┬───────────┘
                      │                           │
                      └────────────────┬──────────┘
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │ Log Activity (x2):     │
                          │                        │
                          │ 1. Employee-Facing:    │
                          │    "You withdrew X"    │
                          │    actor: employee     │
                          │    status: success     │
                          │                        │
                          │ 2. Employer-Facing:    │
                          │    "Employee withdrew" │
                          │    actor: employee     │
                          │    status: success     │
                          │    visibleToEmployer ✓ │
                          └────────────┬───────────┘
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │ Invalidate Queries:    │
                          │ - payment-stream       │
                          │ - employee overview    │
                          │ - employee withdrawals │
                          └────────────┬───────────┘
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │ UI Updates:            │
                          │ - New balance shows    │
                          │ - Withdrawal in history│
                          │ - Activity logged      │
                          └────────────────────────┘
```

---

## Key Decision Points

### 1️⃣ ATA Check

```typescript
const ataAccountInfo = await client.rpc.getAccountInfo(employeeTokenAccount, { encoding: 'base64' }).send();
if (!ataAccountInfo.value) {
  createAtaInstruction; // Idempotent - safe to call multiple times
}
```

### 2️⃣ Database Availability

```typescript
if (!DATABASE_URL) {
  return { reason: 'database-disabled' } // Graceful
}

const stream = await db.findStream(...)
if (!stream) {
  return { reason: 'stream-not-found' } // Also graceful
}
```

### 3️⃣ Activity Logging Strategy

```typescript
// Always log BOTH perspectives:
await createActivityLog({ actorType: 'employee', ... })          // For employee feed
await createActivityLog({ visibleToEmployer: true, ... })       // For employer feed

// Even on errors:
if (error) {
  await createActivityLog({ status: 'failed', ... })  // Both perspectives
}
```

---

## Error Handling Tiers

| Tier         | Type                              | User Feedback            | Logged?  | Employer Sees? |
| ------------ | --------------------------------- | ------------------------ | -------- | -------------- |
| 🟢 Success   | Transaction confirmed             | ✅ Success toast + link  | Yes (x2) | Yes            |
| 🟡 Graceful  | DB unavailable, stream not synced | ℹ️ Info toast (optional) | Yes (x2) | Yes            |
| 🟠 Cancelled | User rejected wallet              | ℹ️ "Cancelled" toast     | Yes (x2) | Yes            |
| 🔴 Error     | Insufficient funds, DB error      | ❌ Error toast           | Yes (x2) | Yes            |

---

## Database Update Paths

### Path A: Full Persistence ✅

```sql
-- Transaction 1: Update stream
UPDATE streams
SET withdrawn_amount = withdrawn_amount + $1,
    last_activity_at = NOW()
WHERE id = $2 AND organization_id = $3;

-- Transaction 2: Log event
INSERT INTO stream_events (
  stream_id, event_type, amount, signature, actor_address, ...
) VALUES ($1, 'stream_withdrawn', $2, $3, $4, ...);

-- Transaction 3 & 4: Log activities (employee + employer)
INSERT INTO organization_activity (...) VALUES (...); -- x2
```

### Path B: Optimistic Update ⚠️

```typescript
queryClient.setQueryData(OVERVIEW_KEY, (old) => ({
  ...old,
  streams: old.streams.map((s) => (s.id === streamId ? { ...s, withdrawnAmount: s.withdrawnAmount + amount } : s)),
  stats: {
    ...old.stats,
    availableToWithdraw: old.stats.availableToWithdraw - amount,
  },
  recentWithdrawals: [
    { id: 'local-temp', amount, occurredAt: new Date().toISOString() },
    ...old.recentWithdrawals,
  ].slice(0, 5),
}));
```

**Note**: Path B data is LOST on page refresh. Only in-memory.

---

## Metadata Structure

### Stream Event Metadata

```json
{
  "streamAddress": "abc123...",
  "amount": 50.5,
  "signature": "xyz789...",
  "mintAddress": "token123...",
  "tokenAccount": "ata456...",
  "timestamp": 1698765432
}
```

### Activity Log Metadata (Employee-Facing)

```json
{
  "amount": 50.5,
  "streamAddress": "abc123...",
  "signature": "xyz789...",
  "actor": "employee",
  "status": "success"
}
```

### Activity Log Metadata (Employer-Facing)

```json
{
  "amount": 50.5,
  "streamAddress": "abc123...",
  "signature": "xyz789...",
  "actor": "employee",
  "visibleToEmployer": true,
  "status": "success",
  "employeeName": "John Doe" // Could add this
}
```

---

## Query Invalidation Strategy (Current)

```typescript
// After successful withdrawal:
setTimeout(() => {
  // 1) Refresh payment-stream queries
  invalidatePaymentStreamQuery();

  // 2) Either apply optimistic overview update OR refetch overview
  if (usedOptimisticUpdate) {
    applyOptimisticUpdate();
  } else {
    queryClient.invalidateQueries({ queryKey: EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY });
  }

  // 3) Refresh employee withdrawal history
  queryClient.invalidateQueries({ queryKey: EMPLOYEE_WITHDRAWALS_QUERY_KEY });
}, 1500); // Wait for blockchain confirmation
```
