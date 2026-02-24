# Cascade Program Capabilities & Gaps

This note summarises what the deployed Cascade Anchor program (`FiE8MasF8sQEsruhk5FGxwR25DvQDS4nfji3h2bvVRoi`) **can** do today, what it explicitly **does not** cover, and how we can bridge those gaps without touching on-chain code. Where a product requirement truly needs a new instruction or state, that is also called out.

Status note (updated February 23, 2026): this document reflects the current hardening state of the Anchor program in `anchor/programs/cascade/src`.

## Supported On-Chain Operations

The program is intentionally small. Every instruction defined under `anchor/programs/cascade/src` maps 1:1 to the generated client helpers you see in `@project/anchor`.

| Instruction                   | What it does                                                                                                                                                                                                              | Key Preconditions                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `create_stream`               | Creates the `PaymentStream` PDA, initialises the vault PDA, transfers the employer’s initial deposit, and records the hourly vesting rate.                                                                                | Employer signs, provides an SPL token account with funds; employee address is stored but does not need to sign. |
| `withdraw`                    | Lets the **employee** withdraw vested funds from the vault. Vested amount is time-based (`hourly_rate × hours since created` capped by `total_deposited`). Updates `withdrawn_amount` and last activity timestamp.        | Stream must be active, employee must sign, employer has no involvement.                                         |
| `refresh_activity`            | Allows the employee to bump `employee_last_activity_at` without actually withdrawing (keeps the inactivity window open).                                                                                                  | Stream active, employee signs.                                                                                  |
| `top_up_stream`               | Lets the employer transfer more tokens into an active vault and bump `total_deposited`.                                                                                                                                   | Stream must be active, employer signs and supplies a token account.                                             |
| `employer_emergency_withdraw` | After 30 days of employee inactivity, the employer can reclaim the remaining escrow, which also flips `is_active` to `false`.                                                                                             | Employer signs; 30-day inactivity window enforced on-chain.                                                     |
| `close_stream`                | Closes both the stream PDA and the vault token account, refunding rent to the employer. If vault tokens remain, it first transfers them back to the employer token account, then closes the vault via explicit token CPI. | Stream must already be inactive; deficits vs expected vault balance are rejected.                               |

### Built-in Safety

- PDAs are derived with the seeds documented in `anchor/docs/cascade-program.md`, so the stream address is deterministic (`b"stream"`, employer pubkey, employee pubkey).
- All value transfers go through checked token CPIs (`transfer_checked`) with mint decimals validated at CPI time.
- Hours are computed off the Solana clock; there is no reliance on user-supplied timestamps.

## What the Program _Does Not_ Handle

These constraints fall out of reading the state struct and instructions:

- **No organisation metadata** – there’s no notion of “company profile”, payroll cadence, contacts, etc. Everything beyond the bare stream lives off-chain.
- **No minted-token registry** – the program stores only the mint address used per stream. It doesn’t know which mint an employer “prefers” across multiple streams.
- **No treasury discovery** – the employer’s SPL token account is supplied per instruction; the program never remembers it. There is no concept of “default treasury account”.
- **No employee directory** – employees are referenced only per stream (one wallet address). Draft/invited states or tags are entirely product-side.
- **No updates to stream metadata** – once a stream is created you cannot change the hourly rate, mint, or employee wallet. You must close and recreate.
- **No pause/resume** – the only way to stop payouts is `employer_emergency_withdraw`, which permanently marks the stream inactive. There’s no “resume” instruction.
- **No guard rails for payroll cadence or runway** – any analytics about monthly burn, runway, etc. must be computed off-chain from the stream data.
- **No batch operations** – every call is single stream / single vault. Bulk top ups or closes require looping client-side.
- **No multi-sig / delegated operators** – the employer’s wallet must sign; there’s no secondary approver list.
- **No alerting or activity logs** – the chain gives you signatures; surfacing alerts/timelines is a backend job.

## How To Bridge Gaps Without Changing the Program

Many product stories can still ship by layering off-chain logic on top of the existing instructions:

| Product Need                                             | Approach without program changes                                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Organisation profile (name, cadence, timezone, policies) | Persist in Postgres (`organizations`, `onboarding_tasks`). Drive UI onboarding and alerts from there.                                                              |
| Default mint / treasury discovery                        | Store employer ATAs in `organization_token_accounts`, sync balances from RPC, and validate addresses before calling `create_stream`/`top_up_stream`.               |
| Employee lifecycle (draft/invited/ready/archived)        | Keep employee records off-chain (`employees`, `employee_status_history`, invitations). When a wallet is “ready”, you can safely call on-chain instructions.        |
| Analytics (burn, runway, KPIs)                           | Pull stream PDAs via RPC, combine with cached token balances, compute derived metrics server-side, and persist snapshots.                                          |
| Activity timelines                                       | Index transactions (signatures) per vault/stream, map to `stream_events`, and render in the dashboard.                                                             |
| Automated cadence reminders                              | Schedule jobs (cron, serverless) that check stream state vs. payroll cadence and notify operators—no on-chain changes needed.                                      |
| Pausing a stream                                         | Use `employer_emergency_withdraw` to claw back, mark inactive, and treat the stream as closed in the UI; to “resume” create a fresh stream with the same employee. |
| Changing rate/mint                                       | Close the old stream (or let it vest out) and call `create_stream` again with the new parameters.                                                                  |

In short, the Solana program handles custody and vesting; everything else is an off-chain concern we model with Drizzle tables and backend jobs.

## When You’d Need Program Changes

Some feature asks simply aren’t possible with the current instruction set. These require amending the Anchor program (state changes and new instructions):

| Desired Capability                                         | Why the current program can’t deliver                                                                               | Likely change                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Pause & resume without clawback**                        | Once `employer_emergency_withdraw` runs, the stream is permanently inactive. There is no toggling `is_active` back. | Add a `reactivate_stream` instruction that validates conditions and flips `is_active` to `true`. |
| **Adjust hourly rate / mint / employee wallet mid-stream** | No instruction mutates those fields; state struct has no concept of versioning terms.                               | Introduce an `update_stream_terms` instruction, likely with additional audit fields.             |
| **Delegated employer operators or multi-sig**              | Employer is always the PDA seed and signer. Delegating requires new authority logic.                                | Add authority lists/PDAs or integrate with SPL governance.                                       |
| **Custom inactivity window**                               | 30-day timeout is hard-coded in `employer_emergency_withdraw`.                                                      | Parameterise inactivity threshold per stream or organisation.                                    |
| **Batch operations atomically**                            | Program handles single stream per txn. Batch semantics would need new instructions or CPI loops.                    | Implement a “batch top up” instruction or rely on client batching with partial failure handling. |
| **Stream-owned metadata (notes, tags, cadence)**           | PaymentStream doesn’t have extra fields; adding them means account size changes.                                    | Extend the account struct and rebuild the program.                                               |

Unless we have one of those requirements on the near-term roadmap, we should keep leveraging the current program and invest in robust off-chain indexing + UX.
