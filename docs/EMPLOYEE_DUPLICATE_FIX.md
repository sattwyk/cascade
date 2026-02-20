# Employee Duplicate Issue - Solutions

## Problem Summary

When adding employees with the **same email** but **different wallets**, the database's unique constraint on `(organization_id, email)` causes the `upsertEmployee` function to **update** the existing record instead of creating a new one. This makes it look like previous employees are deleted.

## Root Cause

In `/src/db/schema.ts` line 187:

```typescript
uniqueIndex('employees_org_email_key').on(table.organizationId, table.email);
```

In `/src/workflows/employee-invite.ts` lines 194-227:

```typescript
.onConflictDoUpdate({
  target: [employees.organizationId, employees.email],
  set: { /* overwrites all fields including wallet */ }
})
```

---

## Solution 1: Prevent Duplicate Emails (IMPLEMENTED ✅)

### What Changed

- Added real-time validation in `AddEmployeeModal` to check for existing emails
- Shows red border and error message when duplicate email is detected
- Prevents form submission if email already exists
- Blocks "Next" button until unique email is provided

### Benefits

- Prevents data loss
- Clear user feedback
- No database changes needed
- Follows common UX patterns (one email = one employee)

### Files Modified

- `/src/components/dashboard/modals/add-employee-modal.tsx`

---

## Solution 2: Allow Multiple Wallets Per Email (Alternative)

If your business requirement is to allow the same person (email) to have multiple wallet addresses, you need to:

### 1. Change Database Schema

Remove the unique constraint on email and use wallet as the unique identifier instead:

```typescript
// In src/db/schema.ts - REMOVE this line:
uniqueIndex('employees_org_email_key').on(table.organizationId, table.email),

// ADD this instead:
uniqueIndex('employees_org_wallet_key').on(table.organizationId, table.primaryWallet),
```

### 2. Create Migration

```bash
cd /home/satty/projects/cascade
pnpm drizzle-kit generate:pg
pnpm drizzle-kit push:pg
```

### 3. Update Workflow Logic

Change `/src/workflows/employee-invite.ts` to upsert on wallet instead:

```typescript
.onConflictDoUpdate({
  target: [employees.organizationId, employees.primaryWallet], // Changed from email
  set: { /* fields */ }
})
```

### 4. Make Email Optional

Allow nullable emails if multiple wallet addresses can belong to same person:

```typescript
email: varchar('email', { length: 255 }), // Already nullable in schema
```

### 5. Update UI Validation

- Require `primaryWallet` field in the modal
- Validate wallet uniqueness instead of email
- Allow same email for different wallets

### Trade-offs

- ⚠️ More complex: wallet addresses are harder for users to manage than emails
- ⚠️ Invitation flow: emails are typically the primary identifier for invites
- ⚠️ Multiple employees with same email may confuse payroll/reporting
- ✅ Flexibility: same person can have multiple payment wallets

---

## Recommendation

**Use Solution 1** (already implemented) unless you have a specific business case where:

- Employees legitimately need multiple wallet addresses
- Each wallet represents a different "employment record" for the same person
- You're willing to redesign invitation/auth flows around wallets instead of emails

For most payroll systems, **one email = one employee** is the standard pattern.

---

## Testing the Fix

1. Try adding an employee with email `test@example.com`
2. Try adding another employee with the **same** email
3. You should see:
   - Red border around email field
   - Error message: "This email is already registered for another employee"
   - "Next" button disabled
4. Change to a different email → validation passes ✅
