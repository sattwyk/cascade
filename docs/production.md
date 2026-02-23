# Cascade Program Production Readiness

This document defines what must be completed before treating the Cascade Anchor program as production-grade for real payroll funds.

## Current Status

The program has strong baseline structure (PDA custody model, account constraints, custom errors), but is not yet production-ready.

Primary gaps:

1. Timestamp arithmetic is not consistently checked.
2. Token transfer CPIs do not use `transfer_checked`.
3. Vault close semantics need explicit token-program close handling.
4. Production-grade test coverage and invariant testing are missing.
5. Security/audit and operational governance artifacts are missing.

## Code Hardening Tasks

### 1) Fix unchecked timestamp math

File: `anchor/programs/cascade/src/instructions/employer_emergency_withdraw.rs`

- Current risk: `clock.unix_timestamp - stream.employee_last_activity_at` can underflow/overflow semantics and does not emit a dedicated error path.
- Required action:
  - Use checked subtraction (`checked_sub`) like `withdraw` does in `anchor/programs/cascade/src/instructions/withdraw.rs`.
  - Return `ErrorCode::InvalidTimestamp` on invalid time ordering.
- Done criteria:
  - Unit/integration tests cover future timestamps and malformed time edges.
  - No unchecked timestamp subtraction remains in instruction handlers.

### 2) Move token CPIs to `transfer_checked`

Files:

- `anchor/programs/cascade/src/instructions/create_stream.rs`
- `anchor/programs/cascade/src/instructions/withdraw.rs`
- `anchor/programs/cascade/src/instructions/top_up_stream.rs`
- `anchor/programs/cascade/src/instructions/employer_emergency_withdraw.rs`
- `anchor/programs/cascade/src/instructions/close_stream.rs`

- Current risk: raw `transfer` does not assert mint decimals at CPI boundary.
- Required action:
  - Migrate to checked transfer variant and pass mint decimals explicitly.
  - Add `mint` to every token-movement instruction account context that currently does not include it (`withdraw`, `top_up_stream`, `employer_emergency_withdraw`, `close_stream`), because checked transfer requires the mint account.
  - Preserve signer seed logic, but update account constraints to include mint consistency checks where required.
  - Optional hardening: migrate `Program<'info, Token>` to `Interface<'info, TokenInterface>` and corresponding account types if Token-2022 compatibility is required.
- Done criteria:
  - All token movement instructions use checked transfer APIs.
  - All required account structs compile with explicit mint account wiring.
  - Tests verify behavior on wrong mint/decimals assumptions.

### 3) Explicitly close vault token account via token CPI

File: `anchor/programs/cascade/src/instructions/close_stream.rs`

- Current risk: relying on attribute-based `close` for the vault token account is unsafe for SPL-token semantics and PDA authority handling.
- Required action:
  - Replace vault auto-close behavior with an explicit `token::close_account` (or token-interface equivalent) CPI.
  - Use `CpiContext::new_with_signer` with stream PDA seeds for vault authority.
  - Close the stream state account only after the token account close succeeds.
- Done criteria:
  - Vault close path uses explicit token-program CPI with PDA signer.
  - Tests cover both non-zero and zero-balance close flows and assert final account states.

### 4) Arithmetic and state invariant review

Files:

- `anchor/programs/cascade/src/instructions/withdraw.rs`
- `anchor/programs/cascade/src/instructions/top_up_stream.rs`
- `anchor/programs/cascade/src/instructions/close_stream.rs`

- Required invariant checks:
  - `withdrawn_amount <= total_deposited`
  - `available_balance` never negative
  - Close path cannot leave vault dust after transfer/close sequence
- Done criteria:
  - Invariants explicitly asserted via tests and documented in code comments where non-obvious.

### 5) Remove time-related magic numbers

Files:

- `anchor/programs/cascade/src/instructions/withdraw.rs`
- `anchor/programs/cascade/src/instructions/employer_emergency_withdraw.rs`

- Current risk: inline time math literals reduce audit clarity and increase maintenance mistakes.
- Required action:
  - Replace `3600` with `SECONDS_PER_HOUR`.
  - Replace `30 * 24 * 60 * 60` with a named constant such as `INACTIVITY_THRESHOLD_SECONDS`.
  - Keep constants in a shared module or instruction-local constant block with clear names.
- Done criteria:
  - No inline time-conversion literals remain in instruction handlers.
  - Constant naming is consistent and self-explanatory.

## Testing Requirements

### 0) Test standard and quality bar

- Keep one test framework in-repo for Anchor tests (current repo standard is Vitest via `pnpm test`).
- Do not add placeholder tests.
- Every new production-readiness test must do real execution work:
  - initialize accounts
  - send transactions
  - verify state transitions
  - verify token balances or close outcomes

### 1) Make localnet integration a required CI lane

File: `anchor/tests/cascade.localnet.integration.test.ts`

- Current behavior: suite is gated and often skipped.
- Required action:
  - Add CI job that runs with `CASCADE_RUN_LOCALNET_TESTS=1`.
  - Ensure local validator startup is deterministic in CI.
- Done criteria:
  - Integration suite runs on every protected branch merge.
  - Failures block release.

### 2) Expand adversarial test coverage

Required test categories:

1. Timestamp edge cases (clock drift/order anomalies).
2. Token account substitution attempts (wrong owner, wrong mint).
3. Double-withdraw and race-like repeated calls in same slot/block window.
4. Emergency withdraw boundaries at exactly and just below inactivity threshold.
5. Close flow with non-zero vault and with zero vault.

Done criteria:

- Tests exist and pass for all categories above.

### 3) Add property/invariant tests

Required action:

- Introduce property-driven tests for core balance invariants over many randomized sequences:
  - create -> top up -> withdraw (n times) -> emergency -> close
- Done criteria:
  - Automated invariant test suite runs in CI.

## Security and Governance Requirements

### 1) External audit before mainnet funds

- Required action:
  - Commission third-party Solana/Anchor audit.
  - Track findings with severity, owner, and remediation PRs.
- Done criteria:
  - No unresolved critical/high findings.
  - Audit report linked in repository docs.

### 2) Threat model and runbook

Required docs to add:

1. Threat model: account spoofing, authority compromise, replay patterns, DoS surfaces.
2. Incident response runbook: freeze/mitigate steps, communication paths, rollback constraints.
3. Key management policy: signer custody, rotation cadence, access approvals.

Done criteria:

- Documents versioned in `docs/`.
- Owners assigned for each runbook section.

### 3) Upgrade authority policy

- Required action:
  - Define explicit policy for program upgrade authority:
    - multisig ownership
    - approval quorum
    - emergency upgrade procedure
    - planned immutability milestone (if any)
- Done criteria:
  - Policy doc published and enforced operationally.

## Release Gating Checklist

Mark all items complete before production go-live:

- [x] Checked timestamp math in all time-sensitive instructions.
- [x] All token transfers migrated to checked transfer API.
- [x] Vault token account is explicitly closed via token-program CPI with PDA signer.
- [x] Invariant test suite added and running in CI.
- [x] Localnet integration tests required in CI.
- [ ] Time-related magic numbers replaced with named constants.
- [ ] External audit completed and all high/critical findings resolved.
- [ ] Threat model + incident runbook + key management docs merged.
- [ ] Upgrade authority policy implemented with multisig controls.
- [ ] Final dry-run performed on devnet/staging with production-like config.

## Suggested Execution Order

1. Code hardening (`timestamp` + `transfer_checked` + explicit vault close CPI).
2. Test expansion and CI enforcement.
3. Audit engagement and remediation loop.
4. Governance/runbook finalization.
5. Production release readiness review.
