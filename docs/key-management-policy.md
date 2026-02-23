# Cascade Key Management Policy

This policy defines practical key-management rules for a solo/duo-maintained production project.

## Scope

- Program upgrade authority
- Deployment/operations wallets
- CI and release credentials with deployment impact

## Ownership

- Primary Maintainer owns policy enforcement.
- Trusted Backup Collaborator (optional) is the second signer/reviewer when available.

## Baseline Requirements

- Keep upgrade authority on a hardware wallet (never browser hot wallet).
- Never store private keys or recovery phrases in the repo, CI logs, chat, or issue trackers.
- Store recovery phrase physically (for example: safe/deposit box), not in cloud notes.
- Use separate wallets for:
  - upgrade authority
  - daily development/testing
  - treasury/operational funds

## Recommended Multisig Setup

For production upgrades, prefer:

- 2-of-2 multisig: Primary Maintainer + Trusted Backup Collaborator, or
- 2-of-3 multisig: Primary Maintainer + trusted collaborator + offline backup signer

If starting single-signer temporarily, define a migration date to multisig before mainnet funds.

## Access and Approval Rules

- Principle of least privilege for all secrets and wallets.
- Any upgrade-authority or signer-set change must be documented in `docs/`.
- Production upgrades should have:
  - localnet/staging validation evidence
  - at least one independent review (if collaborator available)

## Rotation Policy

Rotate immediately when:

- compromise is suspected
- a collaborator is removed
- a key was exposed in an unsafe location

Regular hygiene:

- review signer set and CI secrets at least every quarter
- rotate CI tokens/secrets at least every quarter

## Compromise Procedure

1. Freeze releases and follow `docs/incident-response-runbook.md`.
2. Rotate affected keys and CI credentials.
3. Move upgrade authority to clean signer/multisig.
4. Document incident scope and remediation before resuming normal releases.

## Enforcement Checklist

- Upgrade authority is hardware-backed.
- Seed phrase storage is physical and offline.
- Multisig is configured (or migration deadline is set and tracked).
- Key/signer changes are documented in `docs/`.
- Incident runbook and threat model are current.
