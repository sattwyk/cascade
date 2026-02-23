# Cascade Incident Response Runbook

This runbook is for a solo/duo-maintained project. It prioritizes fast containment, clear evidence capture, and safe recovery.

## Incident Levels

- Critical: suspected/confirmed unauthorized fund movement, upgrade-authority compromise, or exploitable bug.
- Major: core payroll operations are failing for many users, but no confirmed fund loss.
- Minor: localized regressions, partial outages, or monitoring noise.

## Maintainer Roles

- Primary Maintainer: leads triage, containment, and recovery.
- Trusted Backup Collaborator (optional): second reviewer/signer for emergency actions.

## Detection Signals

- CI failures in localnet integration/invariant suites.
- Spike in onchain errors (`InvalidStreamAccounting`, `VaultBalanceInvariantViolated`, constraint failures).
- Suspicious upgrade-authority activity.
- User-reported abnormal behavior.

## Response Steps

1. Freeze releases immediately.
2. Capture evidence:
   - affected stream addresses
   - transaction signatures
   - slot/time window and cluster
   - program logs and failing instruction paths
3. Decide impact level (Critical/Major/Minor).
4. Choose containment path.

## Containment Playbook

### Critical incidents

1. Put frontend into read-only mode for risky actions.
2. Disable/guard specific mutation paths until root cause is understood.
3. If key compromise is suspected, rotate keys per `docs/key-management-policy.md`.
4. If needed, prepare emergency upgrade via the upgrade-authority policy.

### Major incidents

1. Fail over to backup RPC endpoint.
2. Reproduce on staging/localnet.
3. Patch and validate before re-enabling affected flows.

### Minor incidents

1. Patch in normal release flow.
2. Add regression test coverage.

## Recovery Constraints

- Solana transactions are final; no global rollback.
- Program rollback means shipping a new upgrade to prior known-good logic.
- Already-settled onchain state may require explicit remediation steps.

## Re-enable Checklist

Only re-enable full operations when:

- root cause is confirmed or tightly bounded
- fix is validated on localnet/staging
- a second review/sign-off is completed (if collaborator available)
- user-facing note/changelog update is published

## After-Action Requirements

1. Document what happened and what changed.
2. Add regression tests for the exact failure mode.
3. Update `docs/threat-model.md` and this runbook if assumptions changed.
