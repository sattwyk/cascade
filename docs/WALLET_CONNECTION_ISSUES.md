# Wallet Connection and Organization Resolution Notes

Status note (updated February 23, 2026): this document reflects current behavior in:

- `src/features/organization/server/actions/organization-context.ts`
- `src/core/workflows/employer-onboarding.ts`
- `src/app/api/auth/resolve-role/route.ts`

## Executive Summary

The previously reported wallet/email-org resolution issues were partially fixed.

- `registerOrganizationAdmin` role-overwrite concern: mostly fixed for same-org employee conflicts.
- `resolve-role` route “first match wins” behavior: improved with organization-id and role preference selection.
- `resolveOrganizationContext`: improved prioritization exists, but multi-org ambiguity can still occur in edge cases.

## Current Component Status

### 1) `resolveOrganizationContext`

File:

- `src/features/organization/server/actions/organization-context.ts`

Current strategy order:

1. Use wallet + email + persisted org id cookie when available.
2. Fallback to wallet-only match.
3. Fallback to email-only match.

Current residual risk:

- Wallet-only and email-only fallbacks still use `.limit(1)`, so multi-org users may still resolve to the wrong org if no explicit organization is selected.
- Strategy 1 filters by persisted org id after a query using `OR(wallet, email)`, which is better than before but still depends on cookie accuracy.

Severity:

- Medium (context ambiguity), not the previous high-severity “always first match” behavior.

### 2) `registerOrganizationAdmin`

File:

- `src/core/workflows/employer-onboarding.ts`

Current behavior:

- Before upsert, it checks if the same org+email already exists with `role = employee` and throws a fatal error in that case.
- Upsert still sets `role = 'employer'`, but the employee-conflict case in the same organization is now explicitly blocked.

Severity:

- Low-to-medium residual risk.
- Remaining caveat is mostly policy/data-model level (cross-org identity modeling), not a direct same-org silent overwrite bug.

### 3) `resolve-role` API route

File:

- `src/app/api/auth/resolve-role/route.ts`

Current behavior:

- Looks up records by wallet address.
- Selection preference is:
  1. exact organization match (if `organizationId` is supplied)
  2. intended role match
  3. first wallet match

Severity:

- Medium residual ambiguity when users have multiple org memberships and client does not provide organization id.

## Current Risk Matrix

| Component                    | Current State                            | Severity | Recommended Action                                     |
| ---------------------------- | ---------------------------------------- | -------- | ------------------------------------------------------ |
| `resolveOrganizationContext` | Partially fixed, ambiguity remains       | Medium   | Require explicit org selection for multi-org sessions  |
| `registerOrganizationAdmin`  | Same-org employee conflict now blocked   | Low/Med  | Keep guard; add tests for role transitions             |
| `resolve-role` API           | Improved selection logic, still fallback | Medium   | Always send `organizationId` once user chooses context |

## Recommended Next Actions

1. Add explicit organization selector UI for multi-org users after wallet connect.
2. Persist selected organization id and require it in role-resolution flows.
3. Add integration tests for:
   - same wallet across multiple orgs
   - same email across multiple org memberships
   - role switching with and without explicit org id
4. Decide identity policy explicitly:
   - whether wallet must be unique globally
   - or wallet/email can be reused across orgs with explicit context selection

## Suggested Test Scenarios

### Scenario A: Multi-org with explicit org id

1. User belongs to `orgA` and `orgB`.
2. Client sends `organizationId = orgB` to `resolve-role`.
3. Verify `orgB` is selected.

### Scenario B: Multi-org without org id

1. User belongs to multiple orgs under one wallet.
2. Client sends wallet + intended role only.
3. Verify fallback behavior is deterministic and documented.

### Scenario C: Employee-to-employer conflict in same org

1. Existing `organization_users` row has `role = employee`.
2. Run employer onboarding with same org+email.
3. Verify onboarding fails with the expected fatal error.
