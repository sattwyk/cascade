# Cascade Threat Model

Status note (updated February 23, 2026): this threat model reflects the current hardened instruction set and governance controls documented in `docs/production.md`, `docs/incident-response-runbook.md`, `docs/key-management-policy.md`, and `docs/upgrade-authority-policy.md`.

This threat model is written for a solo/duo-maintained project that still aims for production-grade engineering quality.

## Scope

- Onchain program: `cascade` (`FiE8MasF8sQEsruhk5FGxwR25DvQDS4nfji3h2bvVRoi`)
- Client stack: generated Anchor/Gill instruction clients and app mutation flows
- Operational controls around upgrade authority and incident handling

Out of scope:

- General wallet phishing education
- Third-party outages outside Cascade custody boundaries

## Security Goals

- Prevent unauthorized movement of stream funds.
- Preserve accounting invariants (`total_deposited`, `withdrawn_amount`, vault balance).
- Prevent unauthorized program upgrades.
- Detect and contain failures quickly.

## Trust Boundaries

- Employer signer: may create/top-up/emergency-withdraw/close their own stream.
- Employee signer: may withdraw/refresh only for their stream.
- Stream PDA: sole authority for vault token CPIs.
- Upgrade authority: highest-impact key; compromise equals protocol compromise.

## Threats and Controls

### 1) Account spoofing / substitution

Threat:

- Caller passes token accounts with wrong owner or wrong mint.
- Caller passes a fake mint account to weaken transfer guarantees.

Controls:

- Anchor account constraints on owner/mint relationships.
- `has_one = mint` and `has_one = vault` links in stream contexts.
- `transfer_checked` for all token movement instructions.
- Localnet adversarial tests for token-account substitution.

Residual risk:

- Medium if new instructions are added without matching constraints.

Owner:

- Primary Maintainer

### 2) Signer compromise

Threat:

- Employer key compromise.
- Employee key compromise.
- Upgrade authority compromise.

Controls:

- Role checks (`UnauthorizedEmployer`, `UnauthorizedEmployee`).
- Key policy in `docs/key-management-policy.md`.
- Upgrade policy in `docs/upgrade-authority-policy.md`.

Residual risk:

- High until upgrade authority is strictly controlled (multisig/hardware-backed process).

Owner:

- Primary Maintainer

### 3) Replay / repeated invocation patterns

Threat:

- Rapid repeated withdraw/top-up calls attempting state drift.
- Duplicate transaction submission from clients.

Controls:

- Checked arithmetic and explicit stream accounting invariants.
- Localnet property-style tests over randomized instruction sequences.
- Solana transaction semantics (recent blockhash/signature).

Residual risk:

- Low for current instruction set; reassess when new state transitions are added.

Owner:

- Primary Maintainer

### 4) Availability / DoS pressure

Threat:

- Transaction spam or congestion.
- RPC degradation that blocks normal operation.
- Third-party token donations to vault accounts.

Controls:

- Close-path invariant allows surplus vault balance and blocks accounting deficits.
- CI runs deterministic localnet integration/invariant tests.
- Maintain at least one fallback RPC endpoint for ops.

Residual risk:

- Medium operational risk during network instability.

Owner:

- Primary Maintainer

## Assumptions

- Solana runtime and Classic Token Program are trusted dependencies.
- Employers/employees are responsible for wallet hygiene.
- Protected branches and CI checks gate production changes.

## Release Gate

Before any production release:

- Re-check this threat model against code changes.
- Add tests for newly introduced threat surfaces.
- Map external audit findings to this model and resolve High/Critical issues.
