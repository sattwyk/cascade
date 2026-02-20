# Landing Page Wallet Connection - Duplicate Email Issues

## Critical Issues Found

### 1. **`resolveOrganizationContext` - Ambiguous Organization Selection** ⚠️

**Location:** `/src/app/dashboard/actions/organization-context.ts` (lines 50-65)

**Problem:**

```typescript
const whereClause = conditions.length === 2 ? or(...conditions) : conditions[0]!;

const match = await db
  .select({
    /* ... */
  })
  .from(organizationUsers)
  .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
  .where(whereClause)
  .limit(1); // ⚠️ ONLY TAKES FIRST MATCH
```

**Scenario:**
If a user (email: `john@example.com`) belongs to **multiple organizations** with different wallets:

- Organization A: `john@example.com` + `wallet1`
- Organization B: `john@example.com` + `wallet2`

When they connect with `wallet2`, the query uses `OR(email = john, wallet = wallet2)` and **arbitrarily picks the first match**—could be Organization A even though they connected with wallet2!

**Impact:**

- User connects with correct wallet but lands in **wrong organization**
- Data shown is for different organization
- User confusion and potential data leakage

---

### 2. **`registerOrganizationAdmin` - Overwrites User Role** ⚠️

**Location:** `/src/workflows/employer-onboarding.ts` (lines 363-392)

**Problem:**

```typescript
.onConflictDoUpdate({
  target: [organizationUsers.organizationId, organizationUsers.email],
  set: {
    displayName: derivedName,
    walletAddress,
    role: 'employer',  // ⚠️ ALWAYS OVERWRITES TO EMPLOYER
    isPrimary: true,
    joinedAt: now,
    /* ... */
  },
})
```

**Scenario:**

1. User `john@example.com` is invited as **employee** → role = 'employee'
2. Same user creates their own employer organization → role **overwrites** to 'employer'
3. Now both records in same org have role='employer' **OR** the employee record is lost

**Impact:**

- Employee loses access to their employee dashboard
- Role confusion in the system
- Permission issues

---

### 3. **`resolve-role` API - First Match Wins** ⚠️

**Location:** `/src/app/api/auth/resolve-role/route.ts` (lines 46-58)

**Problem:**

```typescript
const [record] = await drizzleClientHttp
  .select({
    /* ... */
  })
  .from(organizationUsers)
  .where(conditions.length === 2 ? and(...conditions) : conditions[0]!)
  .limit(1); // ⚠️ ONLY FIRST MATCH
```

**Scenario:**
Same user belongs to multiple organizations:

- Organization A: employee
- Organization B: employer

When wallet connects, it picks **first match** arbitrarily—user might want Organization B but gets Organization A.

**Impact:**

- Wrong organization context loaded
- User can't access intended workspace
- Confusing UX—user thinks wallet connection failed

---

## Recommended Fixes

### Fix 1: Make `resolveOrganizationContext` Prioritize Wallet Match

```typescript
export async function resolveOrganizationContext(): Promise<OrganizationContext> {
  // ... existing code ...

  const db = drizzleClientHttp;

  // First try exact wallet + email match
  if (email && wallet) {
    const exactMatch = await db
      .select({
        organizationId: organizations.id,
        accountState: organizations.accountState,
        primaryWallet: organizations.primaryWallet,
      })
      .from(organizationUsers)
      .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
      .where(and(eq(organizationUsers.email, email), eq(organizationUsers.walletAddress, wallet)))
      .limit(1)
      .then((rows) => rows.at(0));

    if (exactMatch) {
      return {
        status: 'ok',
        organizationId: exactMatch.organizationId,
        accountState: exactMatch.accountState,
        primaryWallet: exactMatch.primaryWallet,
      };
    }
  }

  // Then try wallet only (more reliable than email)
  if (wallet) {
    const walletMatch = await db
      .select({
        /* ... */
      })
      .from(organizationUsers)
      .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
      .where(eq(organizationUsers.walletAddress, wallet))
      .limit(1)
      .then((rows) => rows.at(0));

    if (walletMatch)
      return {
        /* ... */
      };
  }

  // Finally fallback to email (least reliable)
  if (email) {
    const emailMatch = await db
      .select({
        /* ... */
      })
      .from(organizationUsers)
      .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
      .where(eq(organizationUsers.email, email))
      .limit(1)
      .then((rows) => rows.at(0));

    if (emailMatch)
      return {
        /* ... */
      };
  }

  return { status: 'error', reason: 'organization-not-found' };
}
```

### Fix 2: Add Organization Selector for Multi-Org Users

If user belongs to multiple organizations, show a selection UI before proceeding to dashboard.

### Fix 3: Prevent Email Reuse Across Organizations

Add constraint or validation that prevents same email from having different roles in different organizations.

### Fix 4: Make Wallet Primary Identifier

Since wallets are unique to blockchain, use wallet as the PRIMARY unique identifier instead of email. Email can be secondary/metadata.

---

## Current State Summary

| Component                          | Issue                                  | Severity  | Risk             |
| ---------------------------------- | -------------------------------------- | --------- | ---------------- |
| `resolveOrganizationContext`       | OR query picks first match arbitrarily | 🔴 High   | Wrong org loaded |
| `registerOrganizationAdmin`        | Overwrites employee role to employer   | 🔴 High   | Role confusion   |
| `resolve-role` API                 | First match wins with multiple orgs    | 🟡 Medium | Wrong workspace  |
| `upsertEmployee` (employee-invite) | Email conflict overwrites wallet       | 🟢 Fixed  | Already patched  |

---

## Testing Scenarios

### Scenario A: Multi-Organization User

1. User creates employer account → `org1` + `john@example.com` + `wallet1`
2. User invited as employee → `org2` + `john@example.com` + `wallet2`
3. User connects `wallet2` → **May load org1 instead of org2!**

### Scenario B: Role Confusion

1. User invited as employee → role='employee'
2. User creates own employer org with same email → role becomes 'employer'
3. Original employee record lost or overwritten

### Scenario C: Wallet Switch

1. User has `org1` + `john@example.com` + `wallet1`
2. User switches to `wallet2` in browser
3. Cookie still has email, query matches by email → loads wrong org

---

## Priority Recommendations

1. ✅ **Already Fixed:** Employee duplicate email validation (add-employee-modal)
2. 🔴 **Critical:** Fix `resolveOrganizationContext` to prioritize wallet + organizationId combo
3. 🔴 **Critical:** Prevent same email from having different roles across organizations
4. 🟡 **Important:** Add organization selector for multi-org users
5. 🟡 **Nice-to-have:** Make wallet the primary unique identifier system-wide
