# Cascade Next.js Integration Guide

This document explains how to extend the Cascade starter dApp under `src/` so it can drive the on-chain payment stream program described in `anchor/docs/cascade-program.md`. The goal is to replace the placeholder “greet” flow with production-quality data hooks and UI that follow the project’s existing conventions.

## Prerequisites

- Node 20+, pnpm, and Anchor CLI installed.
- A Solana wallet that works with Wallet UI.
- The program deployed to the cluster you intend to use (update `anchor/Anchor.toml` and redeploy if you change clusters).
- Familiarity with React Query, Wallet UI, and the generated client emitted by Codama.

## Generated Client Overview

- `@project/anchor` (see `tsconfig.json`) re-exports:
  - The IDL (`CascadeIDL`).
  - Gill-ready helpers such as `getCreateStreamInstruction`, `fetchPaymentStream`, and the `CASCADE_PROGRAM_ADDRESS`.
- The helpers live in `anchor/src/client/js/generated/`:
  - `instructions/` exposes both synchronous and `Async` variants that derive PDAs for you when possible.
  - `accounts/paymentStream.ts` provides coders to decode on-chain state.
- After changing the program or IDL run:

  ```bash
  pnpm anchor build
  pnpm anchor-client
  ```

  This regenerates the client bindings consumed by the app.

## App Architecture Recap

- Feature modules live under `src/features/*`.
- Each feature uses three folders:
  - `data-access/` for hooks (React Query + Wallet UI).
  - `ui/` for presentational components.
  - Root feature component (e.g. `cascade-feature.tsx`) that composes the data and UI pieces.
- Shared Solana context comes from `useSolana()` in `src/components/solana/use-solana.tsx`, exposing the connected account and a Gill RPC client.
- Toast notifications funnel through `toastTx` (`src/components/toast-tx.tsx`), so instruction hooks should reuse it.

## Implementation Blueprint

### 1. Replace the Greet Mutation

1. Remove `use-greet-mutation.ts`.
2. Create mutation hooks that mirror the greet pattern:
   - `useCreateStreamMutation`
   - `useWithdrawMutation`
   - `useRefreshActivityMutation`
   - `useTopUpStreamMutation`
   - `useEmergencyWithdrawMutation`
   - `useCloseStreamMutation`

Each mutation should:

```ts
const signer = useWalletUiSigner({ account });
const signAndSend = useWalletUiSignAndSend();

return useMutation({
  mutationFn: async (input) => {
    const instruction = await getCreateStreamInstructionAsync({
      employer: signer,
      employee: input.employee,
      mint: input.mint,
      employerTokenAccount: input.employerTokenAccount,
      hourlyRate: input.hourlyRate,
      totalDeposit: input.totalDeposit,
    });
    return await signAndSend(instruction, signer);
  },
  onSuccess: (signature) => toastTx(signature, 'Stream created'),
  onError: (error) => toast.error(error instanceof Error ? error.message : 'Create stream failed'),
});
```

Use the synchronous `get<Name>Instruction` helpers when you already have the PDA addresses; reach for the `Async` variant when you want Gill to derive them automatically.

### 2. Add PDA Helpers

Create `src/features/cascade/data-access/derive-cascade-pdas.ts` to ensure every hook derives PDAs consistently:

```ts
import { getAddressEncoder, getBytesEncoder, getProgramDerivedAddress } from 'gill';

import { CASCADE_PROGRAM_ADDRESS } from '@project/anchor';

const streamSeed = getBytesEncoder().encode(new Uint8Array([115, 116, 114, 101, 97, 109])); // "stream"
const vaultSeed = getBytesEncoder().encode(new Uint8Array([118, 97, 117, 108, 116])); // "vault"

export async function derivePaymentStream(employer: string, employee: string) {
  return getProgramDerivedAddress({
    programAddress: CASCADE_PROGRAM_ADDRESS,
    seeds: [streamSeed, getAddressEncoder().encode(employer), getAddressEncoder().encode(employee)],
  });
}

export async function deriveVault(stream: string) {
  return getProgramDerivedAddress({
    programAddress: CASCADE_PROGRAM_ADDRESS,
    seeds: [vaultSeed, getAddressEncoder().encode(stream)],
  });
}
```

### 3. Stream Fetching

Replace `use-get-program-account-query.ts` with `use-payment-stream-query.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import { fetchMaybePaymentStream } from '@project/anchor';

import { useSolana } from '@/components/solana/use-solana';

import { derivePaymentStream } from './derive-cascade-pdas';

export function usePaymentStreamQuery({ employer, employee }: { employer?: string; employee?: string }) {
  const { client, cluster } = useSolana();

  return useQuery({
    enabled: !!employer && !!employee,
    queryKey: ['payment-stream', { cluster, employer, employee }],
    queryFn: async () => {
      const [streamAddress] = await derivePaymentStream(employer!, employee!);
      return fetchMaybePaymentStream(client.rpc, streamAddress);
    },
  });
}
```

Return `undefined` when the account does not exist so the UI can prompt users to create a stream.

### 4. Feature UI Updates

- Replace `CascadeUiCreate` with a form (`CascadeUiCreateStream`) that gathers employee address, mint, funding account, hourly rate, and deposit amount, then calls `useCreateStreamMutation`.
- Expand `CascadeUiProgram`:
  - Show decoded stream stats (hourly rate, total deposited, available balance computed client-side).
  - Render action buttons wired to the new mutations.
  - Guard each action based on the current wallet (e.g. only the employer should see emergency withdraw).
- Preserve the existing `AppHero`, `Card`, and `AppAlert` styling for continuity.

### 5. Cache Invalidation

- After every successful mutation call `queryClient.invalidateQueries(['payment-stream'])`.
- Consider optimistic updates when the expected balance change is deterministic (withdraw, top up) to reduce perceived latency.

### 6. Error Handling & UX

- Reuse `toastTx` for success notifications so users get Explorer links.
- Surface helpful error messages (`toast.error`) when CPI calls fail (e.g. insufficient funds, inactive stream).
- Disable buttons while mutations are pending to avoid duplicate submissions.

### 7. Local Development Loop

1. Start the dev server:

   ```bash
   pnpm dev
   ```

2. Connect a wallet via the Wallet UI dropdown.
3. Fund the employer’s token account (use `spl-token` or a faucet).
4. Create the stream, then switch to the employee wallet to test withdraw and refresh activity.
5. Use `solana logs` or `anchor test` in another terminal if you need deeper on-chain diagnostics.

### 8. Recommended Enhancements

- Add input validation (e.g. Solana address format, non-zero deposit) using a lightweight schema helper.
- Extract shared formatting helpers for bigint amounts (USDC decimals, etc.).
- Provide a stream selector UI when employers manage multiple employees.
- Add Vitest + React Testing Library coverage for the mutation hooks (mock Gill RPC) and form validation.

## Reference Checklist

- [ ] Generate PDA helpers.
- [ ] Build React Query hooks for every instruction.
- [ ] Replace greet UI with create stream form.
- [ ] Render stream state and attach action buttons.
- [ ] Wire toast notifications and query invalidation.
- [ ] Manually verify flows on devnet (create, withdraw, refresh, top up, emergency withdraw, close).

This workflow keeps the Next.js layer aligned with the existing boilerplate conventions while unlocking the full Cascade payment stream functionality exposed by the Anchor program.
