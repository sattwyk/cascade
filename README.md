<img src="./public/logo.png" alt="Cascade" height="60" />

# Cascade

**Real-time hourly payments on Solana—solving cash flow problems for hourly workers.**

> **⚠️ Work in progress — devnet only**
> This is a hackathon/demo project. The app runs on **Solana devnet** exclusively. Do not use real funds, and do not rely on it for actual payroll or payments. Everything can break, change, or be reset at any time.

Cascade is a blockchain-based payment streaming platform that enables employers to pay hourly workers continuously as they work, rather than waiting for bi-weekly or monthly payroll cycles. Built on Solana for near-instant settlement and minimal fees, Cascade improves worker cash flow and employer flexibility through automated, transparent wage distribution.

---

## The Problem

Traditional payroll systems create unnecessary financial stress for hourly workers:

- **Delayed compensation**: Workers wait weeks or months to access earned wages
- **Poor cash flow**: Hourly employees can't cover unexpected expenses between pay periods
- **Opaque systems**: Limited visibility into earnings and payment schedules
- **High costs**: Traditional payment rails involve expensive intermediaries and slow settlement

Cascade solves this by streaming payments hourly using Solana's blockchain, giving workers immediate access to their earnings while maintaining employer control and security.

---

## How It Works

Cascade uses an Anchor program on Solana to create **payment streams** between employers and employees:

1. **Employer creates a stream**: Deposits funds into an escrow vault and sets an hourly rate
2. **Funds vest continuously**: Tokens unlock hourly based on elapsed time
3. **Employee withdraws anytime**: Workers can claim vested funds on-demand without waiting for payroll cycles
4. **Automated security**: Built-in inactivity checks and emergency withdrawal after 30 days of employee inactivity

All transactions are recorded on-chain for complete transparency and auditability.

---

![Cascade Dashboard](./public/dashboard-preview.png)

---

## Features

### For Employers

- **Payment Streaming**: Fund vaults that automatically unlock tokens hourly
- **Top-Up Flexibility**: Add funds to active streams at any time
- **Emergency Controls**: Reclaim funds if employees become inactive (30+ days)
- **Real-Time Dashboard**: Monitor active streams, runway, and employee activity
- **Employee Management**: Track employees, invitations, and payment history
- **Activity Logging**: Audit trail of all stream operations and transactions
- **Low Costs**: Leverage Solana's sub-cent transaction fees

### For Employees

- **Instant Access**: Withdraw vested earnings anytime without waiting for payday
- **Transparent Earnings**: See exactly how much you've earned in real-time
- **Keep-Alive Option**: Signal activity without withdrawing to prevent stream deactivation
- **Non-Custodial**: Control your wallet; no third-party holds your funds

### Technical Highlights

- **Solana Anchor Program**: On-chain program handling payment logic ([Program ID: `FiE8MasF8sQEsruhk5FGxwR25DvQDS4nfji3h2bvVRoi`](https://explorer.solana.com/address/FiE8MasF8sQEsruhk5FGxwR25DvQDS4nfji3h2bvVRoi))
- **Next.js 16 App Router**: Modern React frontend with Server Components and parallel routes
- **Gill**: Type-safe Solana web library for transactions and RPC calls
- **Wallet UI**: Seamless multi-wallet connection with Solana mobile support
- **React Query**: Real-time data fetching with optimistic updates and cache invalidation
- **PostgreSQL + Drizzle ORM**: Relational database for organization metadata, employees, and activity logs
- **Vercel Workflow**: Durable execution for email verification and onboarding flows
- **Statsig Feature Flags**: Dynamic feature rollout and A/B testing via Vercel Flags SDK
- **Sentry**: Error tracking and performance monitoring

---

## Quick Start

The hosted version is available at [cascade.sattwyk.com](https://cascade.sattwyk.com) — connect your Solana wallet and you're ready to go.

For local development, follow the steps below.

### 1. Enter the dev environment

The project ships a [Nix flake](./flake.nix) that provisions all required tooling (Node.js, pnpm, Rust, Solana CLI, Anchor, Docker, `just`). If you have Nix with flakes enabled:

```bash
nix develop
```

This drops you into a shell with every dependency pinned and ready. No Nix? Install the tools manually:

- Node.js 22+ and pnpm 10+
- Rust (stable) with `wasm32-unknown-unknown` target
- Solana CLI and Anchor
- Docker (for the local database)

### 2. First-time setup

```bash
# Clone the repo
git clone https://github.com/sattwyk/cascade.git
cd cascade

# Verify toolchain, install deps, configure .env, build Anchor program
just setup-local
```

`just setup-local` runs `just doctor` → `pnpm install` → copies `.env.example` → `pnpm run setup` (key sync + codegen) → `pnpm anchor-build` in one shot.

### 3. Start the local database

```bash
# Starts Postgres + Neon HTTP proxy via Docker Compose, then pushes schema
just setup-db
```

### 4. Configure environment variables

Edit `.env` (created in step 2) with your credentials:

```bash
DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/main  # set automatically for local Docker

RESEND_API_KEY=          # transactional email (Resend)
SENTRY_DSN=              # error tracking
STATSIG_SERVER_API_KEY=  # feature flags
FLAGS_SECRET=            # Vercel Flags SDK secret

# Dev faucet — mint test tokens on devnet/localnet
CASCADE_ENABLE_DEV_FAUCET=true
CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR=  # base58 keypair with mint authority
CASCADE_DEV_FAUCET_USDC_MINT=          # USDC mint address
```

See [`.env.example`](./.env.example) for the full list.

### 5. Run the app

```bash
# Start Next.js + local database together
just dev-all

# Or separately
just dev           # Next.js only
docker compose up  # database only
```

Visit [http://localhost:3000](http://localhost:3000).

### Anchor program

```bash
just anchor-localnet   # start local validator
just anchor-build      # compile the program
just anchor-test       # run on-chain tests
just anchor-deploy     # deploy to devnet (default)
```

---

## Architecture

```
cascade/
├── anchor/                    # Solana Anchor program (Rust)
│   ├── programs/cascade/      # Program source
│   ├── tests/                 # On-chain program tests
│   └── src/client/js/         # Generated TypeScript client
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── dashboard/         # Employer & employee dashboards (parallel routes)
│   │   ├── onboarding/        # Multi-step onboarding flows
│   │   └── api/               # API routes for workflows & faucets
│   ├── components/            # React components
│   │   ├── dashboard/         # Employer dashboard UI
│   │   ├── employee-dashboard/# Employee dashboard UI
│   │   ├── onboarding/        # Onboarding wizard components
│   │   └── ui/                # Shadcn/ui components
│   ├── features/              # Feature-specific logic
│   │   ├── account/           # Account profile/preferences
│   │   ├── alerts/            # Notifications and alerting UI
│   │   ├── employees/         # Employee management
│   │   ├── onboarding/        # Invite + verification flows
│   │   ├── organization/      # Organization settings/activity
│   │   └── streams/           # Stream mutations, queries, utilities
│   ├── db/                    # Drizzle ORM schema & client
│   ├── email/                 # React Email templates
│   ├── workflows/             # Vercel Workflow definitions
│   └── lib/                   # Shared utilities & config
└── docs/                      # Technical documentation
```

**Key Technologies:**

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Blockchain**: Solana, Anchor, Gill, Wallet UI
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **State**: React Query (TanStack Query)
- **Email**: React Email, Resend
- **Workflows**: Vercel Workflow (durable execution)
- **Feature Flags**: Statsig, Vercel Flags SDK
- **Monitoring**: Sentry, Vercel Analytics
- **Testing**: Vitest

---

## Usage

### Creating a Payment Stream (Employer)

```typescript
import { getCreateStreamInstructionAsync } from '@project/anchor';

const instruction = await getCreateStreamInstructionAsync({
  employer, // Employer wallet signer
  employee: employeeAddress, // Employee Solana address
  mint, // SPL token mint (e.g., USDC)
  employerTokenAccount, // Employer's token account
  hourlyRate: 10_000000n, // 10 USDC/hour (6 decimals)
  totalDeposit: 1_000_000000n, // 1000 USDC initial deposit
});

// Sign and send transaction using Wallet UI + Gill...
```

### Withdrawing Funds (Employee)

```typescript
import { getWithdrawInstruction } from '@project/anchor';

const withdrawIx = getWithdrawInstruction({
  employee, // Employee wallet signer
  stream, // Payment stream PDA
  vault, // Vault PDA
  employeeTokenAccount, // Employee's token account
  amount: 50_000000n, // Withdraw 50 USDC
});

// Sign and send transaction...
```

For complete code examples and PDA derivation, see [`anchor/docs/cascade-program.md`](./anchor/docs/cascade-program.md).

---

## Documentation

- **[Cascade Program Guide](./anchor/docs/cascade-program.md)**: Complete Anchor program reference with instruction examples
- **[Employer Dashboard Spec](./docs/employer-dashboard-product-spec.md)**: Product requirements and technical architecture
- **[Next.js Integration Guide](./docs/cascade-nextjs-guide.md)**: How to integrate the Cascade program with Next.js
- **[Feature Flags Dashboard](./docs/feature-flags-dashboard.md)**: Using Statsig feature flags

---

## Environment Variables

Key environment variables (see [`.env.example`](./.env.example) for complete list):

```bash
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/cascade

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Monitoring (Sentry)
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=your-public-sentry-dsn

# Feature Flags (Statsig)
STATSIG_SERVER_API_KEY=your-statsig-server-api-key
FLAGS_SECRET=your-flags-secret

# Dev Faucet (for hackathons/testing on devnet)
CASCADE_ENABLE_DEV_FAUCET=false
CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR=your-base58-keypair
CASCADE_DEV_FAUCET_USDC_MINT=your-usdc-mint-address
```

---

## Roadmap

### Current (MVP) ✅

- ✅ On-chain payment streaming with hourly vesting
- ✅ Employer dashboard for stream management
- ✅ Employee dashboard for viewing streams and withdrawing
- ✅ Multi-wallet support via Wallet UI
- ✅ Database-backed employee directory and activity logs
- ✅ Email verification and onboarding workflows
- ✅ Feature flags for gradual rollout

### Next Steps

- [ ] Multi-token support (SOL, USDT, EURC)
- [ ] Automated alerts (email/SMS for low balance, inactivity)
- [ ] Batch operations (bulk top-up, scheduled payments)
- [ ] Advanced analytics (burn rate forecasting, trends)
- [ ] Mobile-optimized employee app
- [ ] Multi-organization support (SaaS platform)

---

## Development

### Running Tests

```bash
# Run frontend tests
pnpm test

# Run Anchor program tests
pnpm anchor-test

# Run a specific test file
pnpm exec vitest run anchor/tests/cascade.test.ts
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code with Oxfmt
pnpm format

# Check formatting
pnpm format:check

# Run all CI checks
pnpm ci
```

### Database Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Push schema directly (dev only)
pnpm db:push
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Ensure all checks pass before submitting:

```bash
pnpm ci
```

---

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Built with:

- [Anchor](https://www.anchor-lang.com/) - Solana program framework
- [Gill](https://github.com/wallet-standard/gill) - Type-safe Solana web library
- [Wallet UI](https://wallet-ui.com/) - Multi-wallet connection for Solana
- [Next.js](https://nextjs.org/) - React framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Vercel Workflow](https://vercel.com/docs/workflow) - Durable execution engine
- [Statsig](https://statsig.com/) - Feature flags and experimentation

**Cascade** — Pay workers hourly, transparently, on Solana.
