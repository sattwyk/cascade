# Cascade Upgrade Authority Policy

This policy defines how program upgrades are approved and executed for a solo/duo-maintained project.

## Goals

- Prevent unilateral or accidental upgrades.
- Make emergency patching possible without bypassing controls.
- Provide a path to eventual immutability once the program is stable.

## Authority Model

- Preferred model: multisig-controlled upgrade authority.
- Minimum acceptable production model: 2-of-2 multisig.
  - Signer 1: Primary Maintainer
  - Signer 2: Trusted Backup Collaborator
- Recommended resilience model: 2-of-3 multisig.
  - Primary Maintainer
  - Trusted Backup Collaborator
  - Offline backup signer (hardware wallet, cold storage)

Single-signer upgrade authority is allowed only for early development and must be migrated before mainnet funds.

## Upgrade Approval Quorum

Normal upgrades require:

- multisig quorum approval (`2` signatures minimum)
- validated build artifacts
- successful localnet/CI checks
- one independent review (if collaborator is available)

## Emergency Upgrade Procedure

Emergency upgrades are allowed only for critical security/availability issues.

Procedure:

1. Trigger incident response (`docs/incident-response-runbook.md`).
2. Freeze non-essential deployments and gather evidence.
3. Build minimal patch with focused scope.
4. Run localnet regression tests and invariant suite.
5. Execute upgrade through multisig quorum.
6. Publish short incident/change summary in `docs/` or release notes.

Emergency path still requires multisig quorum; no bypass key is allowed.

## Change Management Requirements

- Every upgrade must have:
  - commit hash and release tag
  - reason for upgrade
  - test evidence (CI/localnet result)
- Upgrade decisions should be documented in PR notes or a release log.

## Immutability Milestone

Target:

- After external audit completion, at least one production release cycle with no High/Critical findings, and stable operational metrics for 60+ days, evaluate revoking upgrade authority.

Decision options:

- keep multisig upgradeable (active development mode), or
- revoke authority and make the deployed program immutable.

Final decision must be documented before mainnet payroll scaling.
