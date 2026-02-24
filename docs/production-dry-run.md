# Cascade Production-Like Dry Run (Devnet/Staging)

Status note (updated February 23, 2026): this runbook aligns with the current CI setup in `.github/workflows/anchor-localnet-ci.yml`.

This runbook is the final pre-go-live rehearsal required by `docs/production.md`.

## Goal

- Prove end-to-end behavior in a production-like environment.
- Capture repeatable evidence for each critical flow.
- Confirm monitoring and operational procedures work before mainnet funds.

## Environment Requirements

- Solana cluster: devnet (or dedicated staging cluster)
- Build target: same commit planned for release
- CI green on `Anchor Localnet CI` workflow:
  - `quality-checks` job
  - `localnet-tests` job
- Test wallets:
  - employer wallet
  - employee wallet
  - optional attacker wallet for negative checks

## Pre-Run Setup

- [ ] Confirm commit hash under test: `____________`
- [ ] Deploy tested program binary to staging/devnet.
- [ ] Configure app to point to staging/devnet RPC.
- [ ] Prefund required wallets with SOL and test tokens.
- [ ] Verify upgrade authority path is usable (no actual authority changes required).

## Dry-Run Test Matrix

Execute all operations through the real app/client flows.

| Flow                            | Expected Result                                   | Evidence (signature/screenshot/log) | Pass/Fail |
| ------------------------------- | ------------------------------------------------- | ----------------------------------- | --------- |
| Create stream                   | Stream + vault created, funds moved to vault      |                                     |           |
| Employee withdraw               | Only vested amount withdraws, state updates       |                                     |           |
| Refresh activity                | `employee_last_activity_at` updates               |                                     |           |
| Top-up stream                   | Vault and `total_deposited` increase              |                                     |           |
| Emergency withdraw boundary     | Fails before threshold, passes at/after threshold |                                     |           |
| Close stream (non-zero vault)   | Vault drains then closes, stream closes           |                                     |           |
| Close stream (zero vault)       | Stream and vault close cleanly                    |                                     |           |
| Negative: invalid token account | Fails with constraint error                       |                                     |           |
| Negative: unauthorized signer   | Fails with auth error                             |                                     |           |

## Operational Checks

- [ ] Incident runbook is current and usable (`docs/incident-response-runbook.md`).
- [ ] Key management policy is followed for signers (`docs/key-management-policy.md`).
- [ ] Upgrade authority policy is documented and actionable (`docs/upgrade-authority-policy.md`).
- [ ] Fallback RPC endpoint works if primary endpoint is unavailable.

## Pass Criteria

All must be true:

- [ ] Every matrix row marked `Pass`.
- [ ] No unexplained onchain failures.
- [ ] No invariant violations observed.
- [ ] Evidence captured for every critical flow.

## Final Sign-Off Record

- Date:
- Commit hash:
- Cluster:
- Primary Maintainer:
- Optional reviewer/collaborator:
- Go/No-Go decision:
- Notes:
