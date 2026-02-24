<img src="./public/logo.png" alt="Cascade" height="60" />

# Cascade

Real-time hourly payments on Solana for employers and employees.

> Work in progress and devnet/localnet focused.
> Do not use real funds or treat this as production payroll software.

## Current Status (February 24, 2026)

Cascade is moving toward a **minimum usable product (MUP)** release on devnet.

- Employer core stream flows are integrated in the dashboard.
- Anchor program supports create, top up, withdraw, refresh activity, emergency withdraw, and close.
- Roadmap for release sequencing is finalized in [ROADMAP.md](./ROADMAP.md).

Known active gaps before MUP gate:

- Employee streams page is still being migrated from mock data to live query-backed data.
- Multi-organization context UX needs explicit org selection.
- Stream activity query path needs DB-level optimization (currently over-fetch + in-memory filtering).
- Some non-core surfaces are placeholder/preview and controlled by feature flags (`templates`, `reports`, etc.).

## What Cascade Solves

Traditional payroll is periodic and delayed. Cascade enables hourly workers to withdraw vested funds as they accrue, while employers retain controls over funding and inactivity handling.

## Core Capabilities

### On-chain (Anchor program)

Program id in-repo: `FiE8MasF8sQEsruhk5FGxwR25DvQDS4nfji3h2bvVRoi`

- `create_stream`
- `top_up_stream`
- `withdraw`
- `refresh_activity`
- `employer_emergency_withdraw`
- `close_stream`

Important constraints:

- 6-decimal mint policy is enforced.
- No pause/resume instruction today.
- No stream reactivation instruction today.
- No in-place stream term edits (rate/mint/employee); close + recreate is required.

See [anchor/docs/cascade-program.md](./anchor/docs/cascade-program.md) and [docs/cascade-program-capabilities.md](./docs/cascade-program-capabilities.md).

### Product surfaces

Employer:

- Onboarding and organization setup
- Employee directory/invitations
- Streams management (create/top-up/emergency/close)
- Activity and alerts views

Employee:

- Overview, history, and profile
- Withdraw and activity refresh flows

Route flags map:

- [docs/feature-flags-dashboard.md](./docs/feature-flags-dashboard.md)

## Quick Start

### 1. Tooling

Preferred: Nix shell with pinned dependencies.

```bash
nix develop
```

Without Nix, install:

- Node.js 22+
- pnpm 10+
- Rust + Cargo
- Solana CLI
- Anchor CLI
- Docker

### 2. First-time setup

```bash
git clone https://github.com/sattwyk/cascade.git
cd cascade
just setup-local
```

`just setup-local` runs local checks, installs deps, prepares `.env`, syncs Anchor keys, regenerates client bindings, and builds the Anchor program.

### 3. Start database

```bash
just setup-db
```

### 4. Configure environment

Use [`.env.example`](./.env.example) as the source of truth. Minimum common vars:

```bash
DATABASE_URL=<postgres-connection-string>
STATSIG_SERVER_API_KEY=...
FLAGS_SECRET=...
SENTRY_DSN=...
RESEND_API_KEY=...
```

Optional dev faucet and cluster settings are also documented in [`.env.example`](./.env.example).

### 5. Run app

```bash
just dev-all
```

Or individually:

```bash
just dev
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

## Common Commands

```bash
# Web
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm format:check
pnpm test

# Database
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio

# Anchor / codegen
pnpm setup
pnpm anchor-build
pnpm anchor-localnet
pnpm anchor-test
pnpm codama:js
```

`just` wrappers are available in [justfile](./justfile).

## Testing Notes

- `pnpm test` runs Vitest suites.
- Localnet integration tests are gated and run when `CASCADE_RUN_LOCALNET_TESTS=1` (or local Anchor provider env is set).
- `pnpm anchor-test` runs Anchor tests inside `anchor/`.

Example:

```bash
CASCADE_RUN_LOCALNET_TESTS=1 pnpm test
```

## Repository Structure (Current)

```text
cascade/
├── anchor/                    # Anchor program + tests + generated TS client
│   ├── programs/cascade/src/
│   ├── tests/
│   └── src/client/js/
├── src/
│   ├── app/                   # Next.js App Router routes (incl. dashboard parallel routes)
│   ├── core/                  # Shared infrastructure: db, auth, ui, workflows, config
│   ├── features/              # Domain modules: streams, employees, organization, onboarding, alerts
│   ├── components/            # Shared app/landing/Solana components
│   └── types/
├── docs/                      # Product, integration, security, ops docs
├── ROADMAP.md                 # MUP execution roadmap
└── justfile                   # Dev workflow commands
```

## Docs Index

Core:

- [ROADMAP.md](./ROADMAP.md)
- [anchor/docs/cascade-program.md](./anchor/docs/cascade-program.md)
- [docs/cascade-program-capabilities.md](./docs/cascade-program-capabilities.md)
- [docs/employer-dashboard-integration.md](./docs/employer-dashboard-integration.md)
- [docs/cascade-nextjs-guide.md](./docs/cascade-nextjs-guide.md)
- [docs/feature-flags-dashboard.md](./docs/feature-flags-dashboard.md)

Readiness and operations:

- [docs/production.md](./docs/production.md)
- [docs/production-dry-run.md](./docs/production-dry-run.md)
- [docs/external-audit-engagement.md](./docs/external-audit-engagement.md)
- [docs/threat-model.md](./docs/threat-model.md)
- [docs/incident-response-runbook.md](./docs/incident-response-runbook.md)
- [docs/key-management-policy.md](./docs/key-management-policy.md)
- [docs/upgrade-authority-policy.md](./docs/upgrade-authority-policy.md)

## Contributing

Contributions are welcome.

1. Fork the repo
2. Create a branch
3. Make changes
4. Run checks (`pnpm ci`)
5. Open a PR

## License

Apache License 2.0. See [LICENSE](./LICENSE).

---

Last reviewed: February 24, 2026
