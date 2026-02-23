# Cascade Next.js Integration Guide

Status note (updated February 23, 2026): this guide reflects the current `src/features/streams` architecture and generated Anchor client workflow.

## Purpose

Use this guide when wiring Next.js UI flows to the Cascade Anchor program from this repository.

Canonical on-chain reference:

- `anchor/docs/cascade-program.md`

## Current Integration Architecture

- **Program client alias**: `@project/anchor` -> `anchor/src`
- **Generated client output**: `anchor/src/client/js/generated`
- **Wallet + RPC context**: `src/components/solana/solana-provider.tsx`, `src/components/solana/use-solana.tsx`
- **Stream feature module**:
  - Mutations: `src/features/streams/client/mutations`
  - Queries: `src/features/streams/client/queries`
  - PDA/helpers: `src/features/streams/client/utils/derive-cascade-pdas.ts`
  - UI: `src/features/streams/components`
  - Server actions: `src/features/streams/server/actions`
- **Dashboard routes**: `src/app/dashboard/@employer`, `src/app/dashboard/@employee`

## Program Change -> Client Regeneration

After any Anchor program or IDL change:

```bash
pnpm run anchor-build
pnpm run codama:js
```

Optional full sync command:

```bash
pnpm run setup
```

Then run checks:

```bash
pnpm test
pnpm run anchor-test
```

## Instruction Wiring Pattern (Current Standard)

When adding or updating a stream instruction in the app:

1. Derive required PDAs using `derive-cascade-pdas.ts`.
2. Build instruction with generated helpers from `@project/anchor`.
3. Send with `useWalletUiSignAndSendWithFallback` (legacy first, retries v0 when needed).
4. Persist off-chain side effects via server actions when applicable.
5. Invalidate React Query caches via:
   - `useInvalidatePaymentStreamQuery`
   - `useInvalidateDashboardStreamsQuery`

Minimal mutation pattern:

```ts
const signer = useWalletUiSigner({ account });
const signAndSend = useWalletUiSignAndSendWithFallback();
const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();

const instruction = getTopUpStreamInstruction({
  employer: signer,
  stream,
  mint,
  vault,
  employerTokenAccount,
  additionalAmount,
});

const signature = await signAndSend(instruction, signer);
toastTx(signature, 'Top up submitted');
await invalidatePaymentStreamQuery();
```

## Data Fetching Pattern

- Server-side pages fetch initial data through server queries/actions.
- Client components hydrate and keep data live through React Query hooks.

Example path:

1. `src/app/dashboard/@employer/streams/page.tsx` calls `getStreamsForDashboard`.
2. `src/features/streams/components/employer-streams-tab.tsx` uses `useDashboardStreamsQuery({ initialData })`.
3. Mutations invalidate dashboard and stream query keys after successful transactions.

## Feature Flags

Dashboard views are gated by server-side flags in `src/core/config/flags.ts`.
When a flag is disabled, pages render `src/core/ui/feature-flag-disabled.tsx`.

## Local Development Loop

```bash
pnpm dev
```

In another shell, run tests as needed:

```bash
pnpm test
pnpm run anchor-test
```

Targeted localnet integration run:

```bash
CASCADE_RUN_LOCALNET_TESTS=1 pnpm exec vitest run anchor/tests/cascade.localnet.integration.test.ts
```

## Common Integration Failures

1. **Stale generated client**: run `pnpm run anchor-build && pnpm run codama:js`.
2. **Cluster mismatch**: wallet/network cluster differs from expected app environment.
3. **Token account constraint failures**: wrong owner/mint passed into instruction accounts.
4. **Unsupported mint decimals**: `create_stream` enforces 6-decimal mints.
5. **Wallet transaction-version issues**: use the fallback sender utility (already standard in stream mutations).

## Quick File Map

- Program entrypoints: `anchor/programs/cascade/src/lib.rs`
- Instruction handlers: `anchor/programs/cascade/src/instructions`
- Stream state/invariants: `anchor/programs/cascade/src/state/payment_stream.rs`
- Generated TS program helpers: `anchor/src/client/js/generated/instructions`
- Main stream mutations: `src/features/streams/client/mutations`
- Dashboard stream query: `src/features/streams/client/queries/use-employer-streams-query.ts`

## PR Checklist for Integration Changes

- [ ] Program + generated client are in sync.
- [ ] New/changed instruction has mutation wiring in `src/features/streams/client/mutations`.
- [ ] Query invalidation is included for affected views.
- [ ] Localnet integration tests pass.
- [ ] `pnpm test` and `pnpm run anchor-test` pass.
