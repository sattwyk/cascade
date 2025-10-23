# Employer Dashboard UX Specification

## Context & Objectives

- Deliver an employer-facing dashboard that orchestrates Cascade’s payment stream lifecycle on Solana.
- Replace the placeholder greet flow with data-rich management tools aligned with the Anchor program (`create_stream`, `top_up_stream`, `refresh_activity`, `employer_emergency_withdraw`, `close_stream`).
- Provide clear, low-friction flows that surface wallet state, stream health, balances, and required actions.

## Personas & Assumptions

- **Primary user:** Payroll or treasury operator with a connected Solana wallet holding the employer’s SPL token accounts.
- User already understands which SPL mint they use (e.g. USDC) and can fund the employer token account.
- Employer may manage multiple employee streams and needs rapid visibility into status and required approvals.

## Information Architecture

- **Global layout:** Keep the existing `AppHero` top banner. Below it, use a two-column layout on desktop (content + right rail) and stacked layout on mobile.
- **Primary navigation tabs (desktop) / segmented control (mobile):**
  1. `Overview` (default landing)
  2. `Streams` (list + filters)
  3. `Employees` (directory-style view; optional future expansion)
  4. `Settings` (connected wallet details, default mint, notification preferences)
- Persist wallet status in the header via Wallet UI. If no wallet, prompt to connect immediately.
- **Sidebar (left column):** Navigation rail with collapsible sections:
  - `Organization` (Overview, Activity Log, Audit Trail).
  - `Streams` (All Streams, Active, Suspended, Closed, Drafts).
  - `Employees` (Directory, Invitations, Archived).
  - `Tools` (Token Accounts, Templates, Reports).
  - `Support` (Help, Contact, System Status).
- Sidebar states:
  - **Collapsed:** icon-only; expands on hover (desktop) or tap (mobile, overlays content).
  - **Expanded:** shows labels and active sub-route highlight.
  - **Onboarding:** unread step badges (1–4) guiding new employer through setup checklist.
  - **Alerting:** red/orange badges display counts for urgent states (e.g., Suspended streams).

## Global Components & States

- **Wallet banner:** Uses `useSolana()` and Wallet UI connect button; displays cluster, employer public key, and mint selection chip.
- **Right rail cards (desktop):**
  - Funding summary (vault balance, employer token balance, upcoming payroll burn).
  - Alerts (inactivity warnings, low-balance thresholds, failed transactions).
- **Loading & error surfaces:** Rely on React Query’s `status` to show skeleton cards and `AppAlert` inline errors.

## Data Model & Hooks

- Fetch streams via `usePaymentStreamQuery` (single) and `useEmployerStreamsQuery` (new aggregate hook that paginates through `[employer, employee]` pairs).
- Mutation hooks from the Next.js guide (create, withdraw, refresh, top up, emergency withdraw, close).
- After each mutation call `queryClient.invalidateQueries(['payment-stream'])` and relevant aggregate keys (`['employer-streams', employer]`).
- Store UI state (selected stream, modals) with feature-level context (`cascade/ui/employer-dashboard-context.tsx`).

## Detailed Flows

### 0. First-Time Account Creation

1. Dashboard detects missing organization profile (e.g. `organizationProfile` query returns `404`).
2. Display full-screen wizard overlay before exposing navigation:
   - Step 1 `Connect wallet`: confirm connected signer matches intended employer; offer switch wallet button.
   - Step 2 `Organization profile`: collect name, support email, payroll timezone, payroll cadence (weekly/bi-weekly/monthly).
   - Step 3 `Select default token`: enumerate detected SPL mints and associated token accounts; allow manual mint entry and `Create token account` helper.
   - Step 4 `Compliance`: checkbox acknowledgments (funding obligations, emergency withdraw policy) and optional document upload link.
3. Persist profile (backend mutation if available, else local storage). Show progress indicator per step; require completion in order.
4. Upon completion, wizard closes, Overview tab loads with checklist marked complete. CTA `Add Employee` becomes active.
5. If user dismisses wizard mid-way, show persistent banner “Complete organization setup to unlock stream tools” and disable create/top-up actions.

### 1. Wallet Connection & Employer Onboarding

1. Landing renders `Overview` tab.
2. If `account` is undefined:
   - Show full-width `Card` with “Connect your employer wallet” CTA.
   - Explain required assets (funded token account for chosen mint).
   - Disable all action buttons.
3. On successful connection:
   - Trigger fetch of employer metadata (default mint, list of streams).
   - If no default mint saved, open modal to select from detected SPL token accounts (persist in local storage or backend when available).

### 2. Overview Tab States

- **Empty state (no streams & setup complete):**
  - Hero copy: “Get started with your first payment stream.”
  - Setup checklist cards (with checkmarks as tasks complete):
    1. Connect employer wallet.
    2. Verify employer token account funded (show balance vs. required).
    3. Add first employee profile (Flow 3A).
    4. Create payment stream.
  - Primary CTA `Add Employee` until at least one employee exists, then switches to `Create Stream`.
  - Sidebar highlights `Employees > Invitations` with badge `1`.
- **Active state (>=1 active streams):**
  - KPI row (hover tooltips with formulas):
    - `Active Streams` = count of `is_active=true`.
    - `Monthly Burn` = Σ(hourly_rate × 24 × 30 ÷ 10^decimals).
    - `Total Deposited` = Σ(total_deposited) across active streams.
    - `Vault Coverage` = (Σ(vault_balance) ÷ Σ(hourly_rate)) expressed in hours/days remaining.
  - Secondary metrics tiles:
    - `Pending Actions` (count of alerts requiring employer action).
    - `Inactivity Risk` (streams with `employee_last_activity_at` ≥ 25 days).
    - `Clawbacks (30d)` (number of emergency withdrawals in last 30 days).
    - `Token Account Health` (percentage of employer token accounts above safety threshold).
  - Activity timeline: latest 10 events (stream created, top up, withdrawal, refresh, emergency, close, employee added). Filters for `All`, `Funding`, `Employee`, `System`.
  - Alert list: Low runway (<72h), inactivity approaching, suspended streams, token account low balance, pending compliance tasks.
  - Charts (optional advanced view toggle):
    - Burn rate trend (line chart last 30 days).
    - Distribution of spend by department (uses employee tags if available).
- **Suspended-heavy state (majority streams inactive):**
  - Warning banner summarizing counts and recommending review.
  - CTA `Open Suspended Streams` opens Streams list pre-filtered.
- **Maintenance / read-only state:**
  - System status banner from Support; disables mutation buttons but keeps data visible.

### 3. Create Stream Flow

1. CTA entry points: Overview hero button, Streams tab `+ New Stream`.
2. Modal (desktop) / full-screen drawer (mobile) with steps:
   - **Employee selection:** paste public key or select from saved contacts. Validate format (`Pubkey`) with inline error hints.
   - **Token & funding:** pick SPL mint and employer token account (show balances).
   - **Stream economics:** input hourly rate, initial deposit (prefill `hourly_rate × planned_weeks`). Calculate projected runway (deposit / hourly rate).
   - **Review & confirm:** Summarize all fields, estimated network fees, and disclaimers.
3. Submit triggers `useCreateStreamMutation`. While pending:
   - Disable submit and show spinner inside button.
   - Display `toastTx` optimism “Creating stream…”.
4. On success:
   - Close modal, show success toast with signature link.
   - Redirect to Stream detail view (Streams tab auto-select new stream).
5. On error:
   - Keep modal open, surface parsed error (insufficient funds, PDA collision).
   - Provide secondary CTA to “Fund employer account” linking to instructions.

#### 3A. Add Employee Flow (Pre-requisite)

1. Entry points: Overview checklist `Add Employee`, Streams empty state, Employees tab `Invite Employee`.
2. Modal steps:
   - **Profile:** name, optional email (for off-chain notifications), department, location, employment type.
   - **Wallet:** primary Solana address (checksum validation), optional backup wallet, ability to scan QR (mobile).
   - **Settings:** hourly wage reference (fiat), notification preferences, tags (allow multiple).
3. Save action creates employee record in local context or backend; status defaults to `Ready`.
4. Edge cases:
   - No wallet provided: allow “Save as draft” but display badge `Draft` and disable stream creation for that employee.
   - Duplicate wallet detection: warn and offer to merge or continue.
   - Pending invite (email sent): status `Invited`, with resend and revoke actions.
5. Once at least one employee marked `Ready`, enable `Create Stream` CTA and prefill employee selector.

### 4. Streams Tab & List Interaction

- Table/list view with columns: Employee, Mint, Hourly Rate, Vault Balance, Available to Withdraw, Status.
- Filters: status (`Active`, `Inactive`, `Needs attention`), mint, search by employee address.
- Each row clickable, opens Stream detail drawer (right slide-in on desktop, stacked on mobile).
- Bulk actions (future): select multiple streams for top-up; currently disabled but UI should anticipate.

### 5. Stream Detail Drawer

- Header: employee name/address, status pill (Active, Suspended, Closed), cluster.
- Balance section:
  - Vault balance vs. total deposited.
  - Available to employee (`vested - withdrawn`).
  - Runway meter (hours left).
- Activity history: chronological list of transactions with time, actor, amount.
- Action group (buttons contextually enabled):
  - `Top Up` (Flow 6)
  - `Emergency Withdraw` (Flow 7) visible only when `account === employer`.
  - `Close Stream` (Flow 8) enabled when vault balance is zero and `is_active=false`.
- Employee status banner: shows `employee_last_activity_at` relative time, highlight when >25 days (warning) or >30 days (danger).
- Drawer footer utilities:
  - `Copy stream address`, `Copy vault address`.
  - `Open in Explorer` (stream PDA, vault PDA links).
  - `Download activity CSV` (future integration placeholder).
- Drawer states:
  - **Loading:** skeleton placeholders while query resolves.
  - **Pending confirmation:** stream creation submitted but signature pending; display `Awaiting confirmation` banner and retry option.
  - **Suspended:** show red badge, disable `Top Up`, surface `Reactivate` guidance.
  - **Closed:** hide action buttons, show closure timestamp and rent refund summary.

### 6. Top Up Stream Flow

1. Access from Stream detail action.
2. Modal fields: additional amount (token decimals aware), funding source (default employer token account).
3. Display new projected runway and confirm total deposited post top-up.
4. Submit triggers `useTopUpStreamMutation`.
5. Pending: disable controls, show spinner and `toastTx`.
6. Success: close modal, toast success, auto-refresh balances with optimistic update (increment vault balance locally).
7. Error: inline message; keep modal open.

### 7. Employer Emergency Withdraw Flow

1. Available when inactivity window exceeded (>=30 days) or employer explicitly chooses to claw back.
2. Pre-check screen summarizing reason (auto-insert inactivity duration) and consequences (stream deactivated).
3. Requires acknowledgment checkbox (“I understand this suspends the stream and refunds remaining funds”).
4. Trigger `useEmergencyWithdrawMutation`. On success:
   - Show critical success toast “Funds reclaimed, stream set inactive.”
   - Update stream status pill to `Suspended`.
5. Post-withdraw banner offers quick action to “Schedule follow-up” or “Close stream” if vault empty.

### 8. Close Stream Flow

1. Enabled when `vault balance === 0` and stream inactive.
2. Confirmation modal describing rent reclamation, irreversible action.
3. Submit via `useCloseStreamMutation`.
4. On success: remove stream from active list and add to `Closed` filter. Toast with explorer link.
5. If failure due to non-zero balance, show targeted error and CTA to retry emergency withdraw or wait for employee withdrawal.

### 9. Alerts & Notifications

- Global alert center (right rail) aggregates:
  - `Low runway` (less than 3 × hourly rate amount remaining).
  - `Inactivity approaching` (25+ days) and `Inactivity breach` (30+ days).
  - `Transaction failed` (mutation error stored in local state with metadata).
- Each alert links to stream detail and clears automatically after user views or action resolves.
- Use `toastTx` on success and `toast.error` on failure with human-friendly copy.
- Notification states:
  - `Unread`: bold with dot indicator; persists until drawer opened.
  - `Snoozed`: user can defer reminder (e.g., remind tomorrow); remove from alert count temporarily.
  - `Resolved`: archived automatically when condition clears or user dismisses.

### 10. Responsive & Accessibility Considerations

- Mobile: convert tab navigation to sticky segmented control; modals to full-screen sheets; action buttons stacked.
- Keyboard: ensure primary flows are fully tabbable; focus trap modals.
- Dark mode alignment with existing theme tokens.
- Provide copy/paste helpers (copy employee address, share explorer link).

### 11. Future Hooks (Not MVP but design-ready)

- Saved employee directory with labels and multiple active streams per employee.
- Automated top-up scheduling (recurring reminders).
- Export payroll history CSV.
- Role-based access (multiple employer wallet delegates).
- Audit log timeline with filters (action type, actor).
- Forecast vs. actual spend analytics dashboard.

## Navigation States (Reference)

- **Overview**
  - `Loading`: skeleton cards while queries resolve.
  - `Empty`: checklist mode (no streams yet).
  - `Operational`: metrics populated, actions enabled.
  - `Read-only`: maintenance mode disables mutations.
- **Streams**
  - `Empty`: CTA to create first stream.
  - `Default list`: sorted by next payout due.
  - `Filtered`: active filter chips with clear-all.
  - `Bulk select`: future enhancement; disabled but design reserved.
- **Employees**
  - `Directory`: list of profiles with status pills (`Ready`, `Draft`, `Invited`, `Archived`).
  - `Profile detail`: side panel showing contact info, linked streams.
  - `Draft`: missing wallet; prompt to complete.
  - `Invited`: awaiting wallet confirmation; resend and revoke actions.
- **Settings**
  - `Organization`: edit onboarding data; show completion badge.
  - `Wallets`: manage connected wallets and delegates.
  - `Notifications`: toggle email/SMS/webhook options.
  - `Danger zone`: destructive actions (requires multi-confirmation).
- **Support**
  - `Help center`: links to docs/cascade-nextjs-guide.md.
  - `System status`: live badge (Operational/Degraded/Outage).
  - `Contact`: support form with attachment option.

## Implementation Checklist

- [ ] Integrate navigation scaffold (tabs/segments) into `cascade-feature`.
- [ ] Build employer dashboard context provider to manage selected stream + modal state.
- [ ] Implement Overview KPI cards & empty state.
- [ ] Implement Streams list with detail drawer.
- [ ] Ship forms & mutations for create, top up, emergency withdraw, close stream.
- [ ] Wire toast notifications, alerts, and query invalidation.
- [ ] Validate responsive behavior and loading/error states.
- [ ] Deliver onboarding wizard and persist organization profile/default mint selections.
- [ ] Build employee add/invite flow with status badges and draft handling.
- [ ] Implement sidebar collapsed/expanded/onboarding/alert states.
- [ ] Instrument KPI calculations and secondary metrics on Overview.
- [ ] Surface alert center with unread/snoozed/resolved handling.
