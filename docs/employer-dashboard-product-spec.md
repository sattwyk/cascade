# Employer Dashboard Product & Architecture Specification

Status note (updated February 23, 2026): this is a product blueprint with hackathon-era framing. Use `docs/employer-dashboard-integration.md` as the implementation source of truth.

## 1. Vision

Build a Solana-native employer dashboard that empowers payroll operators to configure, fund, and monitor Cascade payment streams in real time. The product should feel production-ready while staying achievable within hackathon timelines: deliver a polished, wallet-connected experience that demonstrates end-to-end streaming payroll on Solana, with clear upgrade paths to a full-fledged SaaS tool.

### Hackathon Success Criteria

1. **Live Solana integration** – create/top-up/withdraw/close streams using the deployed Cascade Anchor program.
2. **Compelling UX** – modern, responsive dashboard that guides employers through onboarding and daily operations.
3. **Storytelling** – documentation and visuals that communicate the problem, the protocol, and business impact.
4. **Extensibility** – architecture that clearly supports future improvements (alerts, analytics, multi-tenant backend).

## 2. Assumptions

Derived from `anchor/docs/cascade-program.md` unless noted.

- **Program** (`FiE8MasF8sQEsruhk5FGxwR25DvQDS4nfji3h2bvVRoi`): governs payment streams via PDAs (`PaymentStream`, `Vault`).
- **Supported operations**: `create_stream`, `withdraw`, `refresh_activity`, `top_up_stream`, `employer_emergency_withdraw`, `close_stream`.
- **Funds & custody**: employer funds escrow vault (SPL token); employee withdraws vested tokens hourly. Employer can claw back after 30 days of inactivity.
- **Environment**: hackathon demo runs on Solana devnet; wallets managed in browser via Wallet UI.
- **Backend**: server actions + database-backed flows now exist for organization, employees, streams, and activity logs (with selective client persistence fallbacks for setup UX).
- **Data freshness**: real-time (React Query) polling for stream data (~60s) is sufficient.
- **Token support**: single SPL mint per organization for MVP.

## 3. User Personas & Journeys

- **Employer Treasury Operator**
  - Connects wallet, configures organization profile (timezone, mint, token account).
  - Adds employees, creates streams, funds vaults, monitors activity/alerts.
  - Executes emergency withdraws or closes streams when necessary.
- **Employee (future scope)**: limited to viewing their stream status (not in hackathon MVP).

### Core Journeys

1. First-time setup (wallet connect → onboarding wizard → create first stream).
2. Manage existing streams (view metrics, top up, respond to alerts).
3. Emergency intervention (withdraw inactive stream, close after funds refunded).

## 4. Functional Scope (Hackathon MVP)

### 4.1 Onboarding & Organization

- Wallet banner shows connected signer, cluster, default mint.
- Onboarding wizard captures:
  - Organization name, support email.
  - Payroll timezone & cadence.
  - Default SPL mint + employer token account (with manual entry).
  - Policy acknowledgements (activity expectations, emergency withdraw).
- Wizard persists to local storage (mock backend).

### 4.2 Employee Directory

- Add/invite employee modal (profile, wallet, tags, hourly wage reference).
- Directory list with filters (all/ready/draft/invited/archived).
- Side panel with employee details, linked stream summary.
- Manual status transitions stored locally.

### 4.3 Streams Management

- Streams tab lists streams with search/filters, derived metrics (vault, available, last activity).
- Detail drawer: balances, runway, inactivity, PDAs, action buttons.
- Mutations:
  - **Create stream**: collects employee, mint, employer token account, hourly rate, initial deposit → calls `getCreateStreamInstructionAsync`.
  - **Top up**: additional amount, optional token account override → `getTopUpStreamInstruction`.
  - **Emergency withdraw**: acknowledge consequences → `getEmployerEmergencyWithdrawInstruction`.
  - **Close stream**: require zero vault balance → `getCloseStreamInstructionAsync`.
- All mutations use wallet signer via Wallet UI / Gill; success toasts with explorer links.
- React Query invalidation keeps UI in sync (`useInvalidatePaymentStreamQuery`).

### 4.4 Overview & Alerts

- KPI cards (active streams, monthly burn, total deposited, vault coverage) computed from live stream data.
- Secondary metrics (pending actions, inactivity risk) summarised from `useEmployerStreamsQuery`.
- Right rail: funding summary and prioritized alerts (low runway, inactivity, suspended streams).
- Activity timeline remains mocked for hackathon (placeholder until logs integration).

### 4.5 Settings

- Organization settings page to edit onboarding data.
- Appearance/notifications tabs can remain mostly mocked, but structure exists for future use.

## 5. Non-Functional Requirements

- Responsive layout (desktop sidebar + right rail; mobile stacked views).
- Loading skeletons and error toasts for mutation failures.
- Consistent time formatting (relative inactivity with fallback to `—`).
- Hydration safety (use client-only logic after mount).
- Accessibility: keyboard focus for modals, `aria` labeling of interactive controls.

## 6. Architecture

### 6.1 Frontend Stack

- **Framework**: Next.js 16 (App Router), Typescript.
- **State/query**: React Query + custom context (`DashboardProvider`).
- **Wallet**: Wallet UI (Gill integration) via `useSolana`, `useWalletUiSigner`.
- **Solana client**: `@project/anchor` generated bindings + Gill RPC.
- **Styling**: Tailwind CSS + project `ui` components (cards, tabs, sidebar).

### 6.2 Key Modules

- `src/features/streams/client`
  - Query + mutation hooks for stream instructions and dashboard stream views.
  - PDA/amount/error utilities under `src/features/streams/client/utils`.
- `src/features/organization/components/layout`
  - `DashboardProvider` and employer dashboard layout/modal orchestration.
- `src/features/employees`
  - Employee listing/invite/update flows and dashboard-facing employee components.
- `src/components/app-providers.tsx`: Compose React Query + wallet + theme providers.

### 6.3 Data Flow

1. Wallet connects (Wallet UI) → `useSolana()` exposes `account`, `client`.
2. `DashboardProvider` coordinates modal/setup state with server-backed account-state synchronization.
3. `useDashboardStreamsQuery` and `useDashboardEmployeesQuery` hydrate dashboard tabs from server actions.
4. Components subscribe to query data to render metrics, statuses, and feed modals with required PDAs.
5. Mutations (based on connected signer) submit instructions via `useWalletUiSignAndSendWithFallback`, then invalidate queries for UI refresh.

### 6.4 Environment

- Devnet endpoints via Gill RPC (`useSolana().client`).
- Backend-enabled flows are active when database configuration is present.
- Local persistence fallback still exists for selected setup/account-state UX.
- On submit, toasts show transaction signature + explorer link (via `toastTx`).

## 7. Implementation Plan (Hackathon)

1. **Baseline setup**
   - Ensure `AppProviders` wraps entire Next.js app (React Query + wallet).
   - Configure environment variables for program ID, cluster (if needed).
2. **Data layer**
   - Finish `useEmployerStreamsQuery` and helpers (already implemented).
   - Add token account discovery helper (optional).
3. **UI integration**
   - Wire Overview/Streams/Employees tabs to real data (done).
   - Replace `StreamActivityHistory` with placeholder copy explaining forthcoming work.
4. **Mutations**
   - Validate all modals complete instructions successfully on devnet (smoke test).
   - Add guard rails (wallet connect, missing mint/account).
5. **Docs & storytelling**
   - Record demo flow (setup → create stream → top up → emergency).
   - Prepare README + `docs/employer-dashboard-integration.md` + this spec.

## 8. Future Enhancements (Post-Hackathon)

- Replace local storage with backend service (Supabase/Prisma) and user auth.
- Add automated email/SMS/webhook alerts (30-day inactivity, low vault).
- Build employee portal to view earnings and refresh activity.
- Batch operations (bulk top-up, scheduled top-ups).
- Analytics dashboards (burn rate trends, forecast vs. actual).
- Support multiple mints/token accounts per organization.
- Integrate Privy or other multi-wallet auth if product direction requires it.

## 9. Risks & Mitigations

| Risk                                              | Impact                       | Mitigation                                                                                       |
| ------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Wallet rejection & hook order errors              | Runtime crashes              | Guard modals/menus to surface user-friendly toasts, maintain consistent hook usage.              |
| Program errors (insufficient funds, invalid PDAs) | Failed transactions          | Pre-validation in modals, clear error messaging (`toast.error`).                                 |
| Devnet instability                                | Demo interruptions           | Provide fallback instructions to rehydrate, pre-fund token accounts, keep debug console open.    |
| Hydration mismatches                              | UI flicker or console errors | Defer client-only text until after mount (e.g., wallet banner) and avoid server-only randomness. |

## 10. Deliverables Summary (Hackathon)

1. Fully functional employer dashboard on devnet showcasing end-to-end payroll streaming.
2. Documentation:
   - Program overview (`anchor/docs/cascade-program.md`).
   - Next.js integration guide (`docs/cascade-nextjs-guide.md`).
   - Integration status (`docs/employer-dashboard-integration.md`).
   - **This** product & architecture spec.
3. Live demo script + recorded walkthrough.
4. Optional: simple marketing page describing Cascade’s value prop.

With this blueprint, contributors can quickly understand the scope, architecture, and implementation roadmap for the Cascade employer dashboard, ensuring we ship a polished hackathon project that convincingly demonstrates Solana-powered payroll streaming.\*\*\*
