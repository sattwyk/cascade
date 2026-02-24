# Cascade Roadmap

Status: Finalized for Phase 1 execution  
Last updated: February 24, 2026  
Owner: Primary Maintainer

## 1. Purpose

This roadmap defines the path to ship Cascade as a **minimum usable product (MUP)** on devnet, then progress to production-funds readiness.  
It is grounded in current repository docs, current code behavior, and current CI/test status.

## 2. Product Definition: Minimum Usable Product

The MUP must deliver repeatable value for a real employer workflow, not only a demo.

### MUP success outcome

An employer can:

1. Onboard and configure organization basics.
2. Add employees and invite them.
3. Create and fund streams.
4. Monitor stream health and activity.
5. Top up, emergency withdraw, and close streams.

An employee can:

1. See stream status and available earnings.
2. Withdraw vested funds.
3. Refresh activity.
4. Review withdrawal history.

## 3. Current State Snapshot (as of February 24, 2026)

### Strong

1. Anchor program hardening and invariants are implemented.
2. Localnet integration suite exists and is wired in CI.
3. Employer dashboard core flows and server actions are broadly integrated.
4. Build, lint, and unit tests pass in current state.

### Gaps to close before MUP release

1. Employee streams page still uses mock data.
2. Some dashboard surfaces are mock or static placeholders (`templates`, `reports`, `status`, `token-accounts` UI surface).
3. Multi-org resolution still has ambiguity without explicit org selection.
4. On-chain success and DB persistence can diverge in degraded paths.
5. Stream activity query currently over-fetches and filters in memory.
6. Emergency-withdraw and close-stream persistence paths need stricter DB/state synchronization.

### Production-funds blockers (post-MUP)

1. External audit not completed/closed.
2. Final production-like dry run evidence not completed.

## 4. Roadmap Principles

1. Prioritize reliability of core payroll flows over breadth of dashboard surfaces.
2. Use feature flags aggressively to keep release scope controlled.
3. Treat on-chain state as source of truth, with explicit reconciliation into DB.
4. Every critical flow must have integration coverage and rollback/containment playbook.
5. Ship in phases with measurable release gates.

## 5. Scope Boundaries

### In scope for MUP

1. Employer onboarding and org profile completion.
2. Employee invite/add/edit/archive.
3. Stream lifecycle: create, top up, withdraw, refresh activity, emergency withdraw, close.
4. Activity and alerts with dependable persistence behavior.
5. Devnet public beta operations and runbooks.

### Out of scope for MUP (defer)

1. Batch operations.
2. Reactivation instruction (not supported by current program).
3. Multi-mint advanced treasury automation.
4. Rich analytics suite and mature reporting.
5. Mainnet-funds launch.

## 6. Timeline Overview

| Phase   | Dates                            | Goal                                                        |
| ------- | -------------------------------- | ----------------------------------------------------------- |
| Phase 0 | February 24 to February 28, 2026 | Freeze MUP scope and baseline quality                       |
| Phase 1 | March 1 to March 14, 2026        | Close P0 product gaps and remove mock blockers              |
| Phase 2 | March 15 to March 28, 2026       | Data consistency, identity hardening, and performance fixes |
| Phase 3 | March 29 to April 11, 2026       | Test hardening, observability, and release candidate        |
| Phase 4 | April 12 to April 18, 2026       | Devnet MUP release and stabilization                        |
| Phase 5 | April 19 onward                  | Audit and production-funds readiness                        |

## 7. Workstreams and Deliverables

## 7.1 Workstream A: Core Product Flows

### A1. Employee streams page parity

- Priority: P0
- Target: Phase 1
- Deliverables:

1. Replace mock data implementation in `src/app/dashboard/@employee/streams/streams-page-client.tsx`.
2. Reuse live query/data model already used by employee overview and withdrawals.
3. Keep withdraw flow integrated with current mutation hooks and activity logging.

- Exit criteria:

1. No hardcoded stream fixtures in employee dashboard flows.
2. Employee streams page reflects actual DB/on-chain-backed data.

### A2. Stream action consistency

- Priority: P0
- Target: Phase 1
- Deliverables:

1. Remove or disable unsupported `Reactivate Stream` action in `src/features/streams/components/stream-action-buttons.tsx`.
2. Align stream status transitions with actual on-chain instruction model.

- Exit criteria:

1. UI does not expose actions unsupported by program instructions.

### A3. Placeholder surface policy

- Priority: P0
- Target: Phase 1
- Deliverables:

1. Decide per-route behavior for mock/static areas (`templates`, `reports`, `status`, `token-accounts`).
2. Either:
   - hide with feature flags, or
   - explicitly label as non-core beta surfaces.

- Exit criteria:

1. MUP release notes and UI are consistent about what is production-like versus preview.

## 7.2 Workstream B: Data Integrity and Persistence

### B1. On-chain to DB reconciliation

- Priority: P0
- Target: Phase 2
- Deliverables:

1. Implement scheduled reconciliation worker for stream state (`streams`, `stream_events`, derived metrics).
2. Make reconciliation resumable and re-entrant using persisted checkpoints (`last_synced_slot`) and bounded paginated batches.
3. Add idempotent upsert semantics and conflict-safe signatures.
4. Add lag metric and alerting for reconciliation delay.

- Exit criteria:

1. Dashboard state converges to on-chain truth after transient failures.
2. Reconciliation lag SLO defined and measured.
3. Worker safely resumes from prior checkpoint after timeout/redeploy without replay corruption.

### B2. Mutation persistence hardening

- Priority: P0
- Target: Phase 2
- Deliverables:

1. Strengthen persistence paths for `emergency withdraw` and `close stream`.
2. Ensure DB stream status and timestamps align with chain outcomes (`suspended` + `deactivatedAt`, `closed` + `closedAt`).
3. Require successful mutations to persist canonical stream linkage (`streamId`) in activity/event write paths.
4. Standardize degraded-mode responses and user-visible copy.

- Exit criteria:

1. Core mutations have deterministic persistence outcomes or explicit degraded contracts.
2. No stream lifecycle mutation writes stream-related activity records without `streamId`.

### B3. Activity data path optimization

- Priority: P1
- Target: Phase 2
- Deliverables:

1. Replace in-memory filtering in `getStreamActivity` with indexed/targeted query strategy.
2. Add DB migration for composite index tuned to query shape: (`organization_id`, `stream_id`, `occurred_at`).
3. Keep metadata-based `streamAddress` matching as transitional fallback only; remove once backfill completes.
4. Add pagination for high-volume org activity routes.

- Exit criteria:

1. Stream activity query scales without over-fetching.
2. Primary activity lookup path uses relational key (`streamId`) rather than JSON metadata scans.

## 7.3 Workstream C: Identity and Organization Context

### C1. Explicit org selector for multi-org users

- Priority: P0
- Target: Phase 2
- Deliverables:

1. Add organization selector after wallet connect for users with multiple memberships.
2. Persist explicit org context and require it in role/org resolution paths.
3. Add deterministic fallback behavior and error UX when org is ambiguous.

- Exit criteria:

1. No silent "first match" org assignment in multi-org sessions.

### C2. Context resolution test matrix

- Priority: P0
- Target: Phase 2
- Deliverables:

1. Integration tests for wallet-only, email-only, wallet+email+org-id permutations.
2. Coverage for employer/employee role conflicts in same org.

- Exit criteria:

1. Org and role resolution behavior is explicit, deterministic, and tested.

## 7.4 Workstream D: Testing and Quality

### D1. Frontend integration tests for critical paths

- Priority: P0
- Target: Phase 3
- Deliverables:

1. Add Playwright critical-path E2E coverage for employer create/top-up/emergency/close flows.
2. Add Playwright critical-path E2E coverage for employee withdraw/refresh flows.
3. Keep existing Anchor localnet and Vitest suites as mandatory lower-layer coverage.
4. Add assertions for dual-perspective activity log creation.
5. Add deterministic time-control strategy in Anchor integration harness so inactivity-threshold flows can be tested end-to-end.

- Exit criteria:

1. Critical user journeys are covered at UI layer and validated against program- and unit-level suites.
2. Inactivity-threshold lifecycle (`employer_emergency_withdraw` -> `close_stream`) is covered by integration tests.

### D2. Localnet CI quality contract

- Priority: P0
- Target: Phase 3
- Deliverables:

1. Keep localnet lane mandatory for protected branches.
2. Add clear failure triage runbook and flake handling policy.

- Exit criteria:

1. CI failures block release by default.

### D3. Regression suites for degraded mode

- Priority: P1
- Target: Phase 3
- Deliverables:

1. Explicit tests where DB is unavailable but on-chain tx succeeds.
2. Verify optimistic client updates and eventual consistency reconciliation.

- Exit criteria:

1. Degraded paths are intentional, tested, and documented.

## 7.5 Workstream E: Observability and Ops

### E1. Structured mutation telemetry

- Priority: P1
- Target: Phase 3
- Deliverables:

1. Emit consistent logs for mutation attempts, outcomes, and persistence state.
2. Add tracing correlation between tx signature and server-action writes.

- Exit criteria:

1. "tx succeeded, DB degraded" incidents are diagnosable in minutes.

### E2. Alerts and runbook integration

- Priority: P1
- Target: Phase 3
- Deliverables:

1. Validate alert-generation workflow cadence and duplicate suppression.
2. Tie alert severities to incident playbook levels.

- Exit criteria:

1. Operational alerts map directly to documented response actions.

## 7.6 Workstream F: Security and Governance (post-MUP, pre-mainnet funds)

### F1. External audit execution

- Priority: P0 for mainnet readiness
- Target: Phase 5
- Deliverables:

1. Scope freeze for audited surfaces.
2. Audit handoff and finding tracker execution.
3. Remediation PRs and re-test closure.

- Exit criteria:

1. No unresolved High/Critical findings.

### F2. Production-like dry run and sign-off

- Priority: P0 for mainnet readiness
- Target: Phase 5
- Deliverables:

1. Execute full dry-run matrix on release commit.
2. Capture evidence for every critical and negative flow.
3. Final Go/No-Go sign-off record in docs.

- Exit criteria:

1. All dry-run pass criteria are satisfied with evidence links.

## 8. Detailed Backlog

Legend: P0 = must for phase goal, P1 = important, P2 = nice-to-have.

| ID    | Priority | Target Phase | Item                                                                                                                                   | Status  |
| ----- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| R-001 | P0       | 1            | Replace employee streams mock data with live query-backed flow                                                                         | Planned |
| R-002 | P0       | 1            | Remove unsupported reactivate action from stream UI                                                                                    | Planned |
| R-003 | P0       | 1            | Feature-flag or relabel non-core placeholder surfaces                                                                                  | Planned |
| R-004 | P0       | 2            | Build on-chain to DB reconciliation worker                                                                                             | Planned |
| R-005 | P0       | 2            | Harden emergency withdraw DB state updates                                                                                             | Planned |
| R-006 | P0       | 2            | Harden close stream DB state updates                                                                                                   | Planned |
| R-007 | P1       | 2            | Optimize stream activity query path (remove in-memory filter strategy)                                                                 | Planned |
| R-008 | P0       | 2            | Add explicit multi-org selector and persistence                                                                                        | Planned |
| R-009 | P0       | 2            | Require org id in role/organization resolution where applicable                                                                        | Planned |
| R-010 | P0       | 2            | Add org resolution integration tests                                                                                                   | Planned |
| R-011 | P0       | 3            | Add integration tests for employer critical flows                                                                                      | Planned |
| R-012 | P0       | 3            | Add integration tests for employee critical flows                                                                                      | Planned |
| R-013 | P1       | 3            | Add degraded-mode persistence/optimistic tests                                                                                         | Planned |
| R-014 | P1       | 3            | Add mutation telemetry correlation (tx signature to DB events)                                                                         | Planned |
| R-015 | P1       | 3            | Validate and schedule alert generation workflow cadence                                                                                | Planned |
| R-016 | P0       | 4            | Execute devnet release smoke matrix and publish evidence                                                                               | Planned |
| R-017 | P0       | 4            | Publish devnet MUP release notes and known limitations                                                                                 | Planned |
| R-018 | P0       | 5            | Run external audit and close findings                                                                                                  | Planned |
| R-019 | P0       | 5            | Execute production-like dry run with final sign-off                                                                                    | Planned |
| R-020 | P1       | 5            | Verifiable build and artifact verification process for release tags                                                                    | Planned |
| R-021 | P0       | 2            | Add composite activity index (`organization_id`, `stream_id`, `occurred_at`) and migrate                                               | Planned |
| R-022 | P0       | 2            | Enforce `streamId` on stream lifecycle activity writes and block null stream writes for lifecycle events                               | Planned |
| R-023 | P1       | 2            | Backfill historical activity rows to map `metadata.streamAddress` to `streamId`                                                        | Planned |
| R-024 | P0       | 2            | Implement resumable reconciliation cursor using `last_synced_slot` with paginated batches                                              | Planned |
| R-025 | P0       | 3            | Add Playwright suite for critical employer and employee journeys                                                                       | Planned |
| R-026 | P1       | 3            | Define and enforce layered test contract (Playwright + Anchor + Vitest) in CI                                                          | Planned |
| R-027 | P1       | 3            | Add deterministic time-control harness support and integration test for `employer_emergency_withdraw` then `close_stream` success path | Planned |

## 9. Release Gates

## 9.1 Devnet MUP Release Gate

All items below must be true:

1. Employer and employee critical flows are live (no mock paths in critical journey).
2. Placeholder/non-core routes are clearly gated or labeled.
3. CI is green on lint, build, unit tests, localnet lane.
4. Critical journey Playwright tests are passing, with Anchor localnet and Vitest suites also green.
5. Reconciliation mechanism is in place for on-chain/DB drift.
6. Incident and rollback procedures are validated in staging/devnet runbook.

## 9.2 Mainnet-Funds Readiness Gate

All items below must be true:

1. External audit complete with no open High/Critical findings.
2. Production-like dry run complete with evidence for full matrix.
3. Upgrade authority, key management, and incident runbooks are current and enforced.
4. Final Go/No-Go sign-off recorded with commit hash and operator approvals.

## 10. Metrics and Targets

## 10.1 Product reliability metrics

1. Transaction success rate by flow (create/top-up/withdraw/refresh/emergency/close).
2. Persistence success rate after on-chain success.
3. Reconciliation lag (P50/P95).
4. Alert freshness (time from condition to alert creation).

## 10.2 MUP targets

1. Greater than or equal to 98% successful tx completion for happy-path operations on devnet.
2. Greater than or equal to 99% persistence success when DB is healthy.
3. Reconciliation lag P95 less than or equal to 120 seconds.
4. Mean time to diagnose critical incident less than or equal to 30 minutes.

## 11. Risks and Mitigations

| Risk                                    | Impact                                         | Mitigation                                                                       |
| --------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| Multi-org ambiguity persists            | Incorrect org context and data leakage risk    | Enforce explicit org selection and required org id in resolution                 |
| DB drift after successful chain tx      | User trust erosion and inconsistent dashboards | Add reconciliation worker plus mutation-level degraded contracts                 |
| Stream linkage depends on JSON metadata | Activity queries degrade and integrity weakens | Enforce `streamId` writes, backfill legacy rows, and deprecate metadata fallback |
| Devnet instability                      | Demo/release reliability hit                   | Add retries, fallback RPC, and dry-run rehearsal evidence                        |
| Scope creep into non-core tabs          | Delay MUP release                              | Strict feature-flag policy and scope freeze in Phase 0                           |
| Low test depth in UI flows              | Regressions in release                         | Add integration tests for critical lifecycle flows in Phase 3                    |

## 12. Governance and Delivery Cadence

1. Weekly roadmap review: every Monday.
2. Risk review and incident readiness check: every Wednesday.
3. Release readiness review: every Friday during Phases 3 and 4.
4. Decision log updates required for scope changes impacting P0 items.

## 13. Immediate Next Actions (starting February 24, 2026)

1. Confirm Phase 1 scope freeze and placeholder route policy.
2. Implement R-001 (employee streams live data parity).
3. Implement R-002 (remove unsupported reactivate action).
4. Implement R-021 and R-022 together to lock activity query correctness.
5. Draft technical design for R-004 and R-024 reconciliation worker behavior.
6. Author hybrid integration test plan for R-011, R-012, R-025, and R-026.

## 14. Tracking Template

Use this section as the live progress log.

### Weekly status log

| Week Of    | Completed | In Progress | Blockers | Owner |
| ---------- | --------- | ----------- | -------- | ----- |
| 2026-02-24 |           |             |          |       |

### Decision log

| Date       | Decision                                | Rationale                                                                       | Impact                                                       |
| ---------- | --------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 2026-02-24 | Employer-first MUP scope                | Maximize usable value quickly                                                   | Non-core surfaces gated or deferred                          |
| 2026-02-24 | Activity query and integrity refinement | Composite index + `streamId` enforcement is safer than metadata-first filtering | Improves scalability and data correctness in Phase 2         |
| 2026-02-24 | Reconciliation worker design baseline   | Resume from `last_synced_slot` with paginated batches                           | Reduces timeout and replay risk under serverless constraints |
| 2026-02-24 | Hybrid test architecture                | Use Playwright for critical UI paths while keeping Anchor/Vitest mandatory      | High confidence with controlled implementation cost          |
