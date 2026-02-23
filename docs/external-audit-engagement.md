# Cascade External Audit Engagement

Status note (updated February 23, 2026): this checklist aligns with the current release gating docs (`docs/production.md`, `docs/production-dry-run.md`) and CI workflow (`.github/workflows/anchor-localnet-ci.yml`).

This document defines how to complete the required third-party Solana/Anchor audit before treating Cascade as production-ready for real payroll funds.

## Goal

- Obtain an external audit report.
- Resolve all High/Critical findings.
- Leave an auditable remediation trail in this repository.

## Scope for Auditor

- Program: `cascade` (`6erxegH47t73aQjWm3fZEkwva57tz2JH7ZMxdoayzxVQ`)
- Code paths:
  - stream creation
  - withdraw
  - top-up
  - emergency withdraw
  - close flow
- Security docs:
  - `docs/threat-model.md`
  - `docs/key-management-policy.md`
  - `docs/upgrade-authority-policy.md`
  - `docs/incident-response-runbook.md`

## Audit Prep Checklist

- [ ] Freeze protocol scope for audit window (no feature work in audited surface).
- [ ] Tag candidate commit for audit handoff.
- [ ] Provide reproducible test commands:
  - `pnpm run ci`
  - `pnpm test`
  - `pnpm run anchor-test`
- [ ] Confirm CI is green in `Anchor Localnet CI`:
  - `quality-checks` job
  - `localnet-tests` job
- [ ] Provide architecture context:
  - `anchor/docs/cascade-program.md`
  - `docs/production.md`
  - `docs/production-dry-run.md`
- [ ] Provide known assumptions/limitations list.

## Deliverables Required from Auditor

- Final report PDF/markdown with:
  - issue list and severity
  - exploitability notes
  - remediation guidance
- Re-test/addendum after fixes (if applicable).

## Finding Tracker

Track every finding here until closure.

| ID  | Severity                 | Summary | Owner              | Fix PR | Status | Notes |
| --- | ------------------------ | ------- | ------------------ | ------ | ------ | ----- |
| TBA | Critical/High/Medium/Low |         | Primary Maintainer |        | Open   |       |

Status values:

- `Open`
- `In Progress`
- `Fixed - Pending Re-test`
- `Closed`

## Exit Criteria (to check off production checklist)

All must be true:

- [ ] External audit report is linked in `docs/`.
- [ ] No unresolved `Critical` or `High` findings remain.
- [ ] All fixes are linked to merged PRs.
- [ ] Re-test/addendum confirms remediations (if requested by auditor).

## Evidence Links

Populate when available:

- Audit firm/contact:
- Audit scope statement:
- Report link:
- Re-test link:
- Final sign-off date:
