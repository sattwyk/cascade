# Cascade Payment Stream Program

This document explains the Cascade on-chain program (program id `6erxegH47t73aQjWm3fZEkwva57tz2JH7ZMxdoayzxVQ`) and how to interact with it from the generated TypeScript client that lives under `src/client/js`. The program implements a payroll-style streaming vault that escrows tokens on behalf of an employer and lets an employee withdraw vested earnings over time, while providing inactivity checks and emergency clawback for the employer.

## Core Accounts and PDAs

- **PaymentStream PDA**  
  Derived with seeds `[b"stream", employer, employee]`. Stores all stream metadata and acts as the authority over the vault. The struct lives in `programs/cascade/src/state/payment_stream.rs` and has the following fields:

  | Field | Type | Meaning |
  | --- | --- | --- |
  | `employer` | `Pubkey` | Signer that funds the stream and retains emergency rights. |
  | `employee` | `Pubkey` | Intended recipient of the streamed funds. Must sign withdrawals and activity refreshes. |
  | `mint` | `Pubkey` | SPL mint of the streamed token (e.g. USDC). |
  | `vault` | `Pubkey` | PDA-owned token account that holds escrowed funds. |
  | `hourly_rate` | `u64` | Amount of tokens that vest per hour. |
  | `total_deposited` | `u64` | Cumulative funds the employer has deposited into the stream. Serves as the vesting cap. |
  | `withdrawn_amount` | `u64` | Total tokens already claimed by the employee. |
  | `created_at` | `i64` | UTC timestamp when the stream was created. |
  | `employee_last_activity_at` | `i64` | UTC timestamp of the employee’s last withdrawal or refresh. |
  | `is_active` | `bool` | Guard flag. Emergency withdrawal sets this to `false`. |
  | `bump` | `u8` | PDA bump used when signing CPI calls. |

- **Vault PDA**  
  Derived with seeds `[b"vault", stream_pubkey]`. It is initialized as an SPL token account and its authority is set to the PaymentStream PDA. All inflows (employer deposits) and outflows (employee withdrawals or emergency refunds) pass through this vault.

- **Employer Token Account**  
  A mutable SPL token account owned by the employer. Tokens move from here to the vault on creation/top-up and back to the employer during an emergency withdrawal or account closure refund.

- **Employee Token Account**  
  The destination SPL token account for employee withdrawals.

The program never mints tokens; it only moves existing SPL tokens among these accounts while enforcing the streaming rules documented below.

## Instruction Reference

All instructions are thin wrappers in `programs/cascade/src/instructions` and the dispatcher lives in `lib.rs`. Each instruction is exposed in the generated TypeScript bindings as `get<Name>Instruction` (synchronous) and, when PDAs can be derived automatically, `get<Name>InstructionAsync`.

### `create_stream(hourly_rate, total_deposit)`

- **Who calls:** Employer signer.
- **Accounts:** employer (signer, payer), employee (address only), mint, stream PDA (init), vault PDA (init), employer token account (mut), token program, system program, rent.
- **Behaviour:**
  1. Initializes and populates the PaymentStream PDA.
  2. Creates the vault PDA as an SPL token account whose authority is the stream PDA.
  3. Transfers `total_deposit` tokens from the employer’s token account into the vault.
  4. Sets `withdrawn_amount` to 0 and timestamps both `created_at` and `employee_last_activity_at`.

### `withdraw(amount)`

- **Who calls:** Employee signer.
- **Accounts:** employee (signer), stream PDA, vault, employee token account, token program.
- **Behaviour:**
  1. Verifies the stream is active and owned by the signer.
  2. Computes elapsed hours since `created_at` and multiplies by `hourly_rate` to calculate the total vested amount. The vested amount is capped at `total_deposited`.
  3. Subtracts `withdrawn_amount` to derive the available balance and ensures `amount` does not exceed it.
  4. Uses the stream PDA signer to transfer `amount` tokens from the vault to the employee’s token account.
  5. Updates `withdrawn_amount` and refreshes `employee_last_activity_at`.

### `refresh_activity()`

- **Who calls:** Employee signer.
- **Accounts:** employee (signer), stream PDA.
- **Behaviour:** Simply bumps `employee_last_activity_at` to the current timestamp, keeping the inactivity window open without performing a withdrawal.

### `top_up_stream(additional_amount)`

- **Who calls:** Employer signer.
- **Accounts:** employer (signer), stream PDA, vault, employer token account, token program.
- **Behaviour:** Transfers `additional_amount` tokens from the employer into the vault and increments `total_deposited`. The stream must still be active.

### `employer_emergency_withdraw()`

- **Who calls:** Employer signer.
- **Accounts:** employer (signer), stream PDA, vault, employer token account, token program.
- **Behaviour:**
  1. Confirms the caller matches the recorded employer.
  2. Requires `employee_last_activity_at` to be at least 30 days in the past.
  3. Calculates the remaining balance as `total_deposited - withdrawn_amount`.
  4. Uses the stream PDA signer to move the remaining funds back to the employer’s token account.
  5. Marks the stream inactive (`is_active = false`).

### `close_stream()`

- **Who calls:** Employer signer.
- **Accounts:** employer (signer), stream PDA (`close = employer`), vault PDA (`close = employer`), token program.
- **Behaviour:** Ensures the stream is already inactive and the vault balance is zero. When both checks pass, closes the stream and vault accounts, refunding their rent to the employer.

## Lifecycle Walkthrough

1. **Setup:** Employer chooses an employee and SPL token mint, then calls `create_stream` to fund the vault with the initial deposit.
2. **Payroll cadence:** Employee periodically calls `withdraw` to collect vested funds. Each withdrawal updates last activity automatically.
3. **Keep-alive:** If the employee wants to stay active without withdrawing (e.g. during leave), they use `refresh_activity` before 30 days have elapsed.
4. **Additional funding:** Employer can call `top_up_stream` any time the stream is still active to extend runway.
5. **Emergency reclamation:** If the employee disappears for 30+ days, the employer can recover the remaining balance via `employer_emergency_withdraw`, which also deactivates the stream.
6. **Clean-up:** After the vault is empty (either through withdrawals or the emergency clawback), the employer closes both PDAs with `close_stream` to reclaim rent.

## Generated TypeScript Client

The Codama-generated client under `src/client/js` uses the `gill` toolchain to build instructions, derive PDAs, and decode stream accounts. The main entry point re-exports everything via `src/client/js/index.ts`, so you can import helpers like:

```ts
import {
  CASCADE_PROGRAM_ADDRESS,
  getCreateStreamInstructionAsync,
  getWithdrawInstruction,
  getRefreshActivityInstruction,
  getTopUpStreamInstruction,
  getEmployerEmergencyWithdrawInstruction,
  getCloseStreamInstruction,
  fetchPaymentStream,
} from '../src/client/js';
```

### Connecting and Sending Transactions

Below is an example showing how to create a stream and immediately send the transaction using the async helper (which derives the PDAs automatically):

```ts
import { getCreateStreamInstructionAsync } from '../src/client/js';
import type { Address } from 'gill';
import {
  createSolanaClient,
  createTransaction,
  generateKeyPairSigner,
  signTransactionMessageWithSigners,
} from 'gill';
import { getAssociatedTokenAccountAddress } from 'gill/programs/token';

const { rpc, sendAndConfirmTransaction } = createSolanaClient({
  urlOrMoniker: 'devnet',
});

const employer = await generateKeyPairSigner();
const employee = await generateKeyPairSigner();
const mint = 'So11111111111111111111111111111111111111112' as Address;

const employerTokenAccount = await getAssociatedTokenAccountAddress(
  mint,
  employer.address
);

const createIx = await getCreateStreamInstructionAsync({
  employer,
  employee: employee.address,
  mint,
  employerTokenAccount,
  hourlyRate: 10n,
  totalDeposit: 1_000n,
});

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const transaction = createTransaction({
  version: 'legacy',
  feePayer: employer,
  instructions: [createIx],
  latestBlockhash,
});

const signedTx = await signTransactionMessageWithSigners(transaction);
await sendAndConfirmTransaction(signedTx);
```

### Withdrawing as the Employee

Assuming you already have `rpc`, the `employer`/`employee` signers, and the shared `mint` from the previous snippet, the synchronous helpers expect you to pass the PDAs explicitly. You can reuse the same derivation logic on the client:

```ts
import { CASCADE_PROGRAM_ADDRESS, getWithdrawInstruction } from '../src/client/js';
import {
  createTransaction,
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  signTransactionMessageWithSigners,
} from 'gill';
import { getAssociatedTokenAccountAddress } from 'gill/programs/token';

// Derive the stream PDA once you know employer + employee.
const [stream] = await getProgramDerivedAddress({
  programAddress: CASCADE_PROGRAM_ADDRESS,
  seeds: [
    getBytesEncoder().encode(new Uint8Array([115, 116, 114, 101, 97, 109])), // "stream"
    getAddressEncoder().encode(employer.address),
    getAddressEncoder().encode(employee.address),
  ],
});

const [vault] = await getProgramDerivedAddress({
  programAddress: CASCADE_PROGRAM_ADDRESS,
  seeds: [
    getBytesEncoder().encode(new Uint8Array([118, 97, 117, 108, 116])), // "vault"
    getAddressEncoder().encode(stream),
  ],
});

const employeeAta = await getAssociatedTokenAccountAddress(mint, employee.address);

const withdrawIx = getWithdrawInstruction({
  employee,
  stream,
  vault,
  employeeTokenAccount: employeeAta, // Populate this with the employee's SPL token account for the stream mint.
  amount: 50n,
});

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
const withdrawTx = createTransaction({
  version: 'legacy',
  feePayer: employee,
  instructions: [withdrawIx],
  latestBlockhash,
});

const signedWithdraw = await signTransactionMessageWithSigners(withdrawTx);
await sendAndConfirmTransaction(signedWithdraw);
```

### Refreshing Activity without Withdrawing

```ts
import { getRefreshActivityInstruction } from '../src/client/js';
import {
  createTransaction,
  signTransactionMessageWithSigners,
} from 'gill';

const refreshIx = getRefreshActivityInstruction({ employee, stream });
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
const refreshTx = createTransaction({
  version: 'legacy',
  feePayer: employee,
  instructions: [refreshIx],
  latestBlockhash,
});

const signedRefresh = await signTransactionMessageWithSigners(refreshTx);
await sendAndConfirmTransaction(signedRefresh);
```

### Topping Up Funding

```ts
import { getTopUpStreamInstruction } from '../src/client/js';
import { createTransaction, signTransactionMessageWithSigners } from 'gill';

const topUpIx = getTopUpStreamInstruction({
  employer,
  stream,
  vault,
  employerTokenAccount,
  additionalAmount: 500n,
});

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
const topUpTx = createTransaction({
  version: 'legacy',
  feePayer: employer,
  instructions: [topUpIx],
  latestBlockhash,
});

const signedTopUp = await signTransactionMessageWithSigners(topUpTx);
await sendAndConfirmTransaction(signedTopUp);
```

### Employer Emergency Withdrawal

```ts
import { getEmployerEmergencyWithdrawInstruction } from '../src/client/js';
import { createTransaction, signTransactionMessageWithSigners } from 'gill';

const emergencyIx = getEmployerEmergencyWithdrawInstruction({
  employer,
  stream,
  vault,
  employerTokenAccount,
});

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
const emergencyTx = createTransaction({
  version: 'legacy',
  feePayer: employer,
  instructions: [emergencyIx],
  latestBlockhash,
});

const signedEmergency = await signTransactionMessageWithSigners(emergencyTx);
await sendAndConfirmTransaction(signedEmergency);
```

### Closing the Stream

After the vault balance reaches zero and the stream is marked inactive (either naturally or via emergency withdrawal), the employer can close the accounts to reclaim rent:

```ts
import { getCloseStreamInstruction } from '../src/client/js';
import { createTransaction, signTransactionMessageWithSigners } from 'gill';

const closeIx = getCloseStreamInstruction({ employer, stream, vault });

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
const closeTx = createTransaction({
  version: 'legacy',
  feePayer: employer,
  instructions: [closeIx],
  latestBlockhash,
});

const signedClose = await signTransactionMessageWithSigners(closeTx);
await sendAndConfirmTransaction(signedClose);
```

### Reading Stream State

Use the generated account fetcher to read the latest on-chain state:

```ts
import { fetchPaymentStream } from '../src/client/js';

const streamAccount = await fetchPaymentStream(rpc, stream);
console.log({
  employer: streamAccount.data.employer,
  employee: streamAccount.data.employee,
  hourlyRate: Number(streamAccount.data.hourlyRate),
  totalDeposited: Number(streamAccount.data.totalDeposited),
  withdrawn: Number(streamAccount.data.withdrawnAmount),
  createdAt: Number(streamAccount.data.createdAt),
  lastActivity: Number(streamAccount.data.employeeLastActivityAt),
  isActive: streamAccount.data.isActive,
});
```

## Operational Tips

- Always make sure the employer pre-funds their SPL token account before calling `create_stream` or `top_up_stream`; otherwise the token transfer CPI will fail.
- The 30-day inactivity window is enforced on-chain using Unix timestamps. If you need a different window, modify `thirty_days` in `employer_emergency_withdraw.rs`.
- Encourage employees to call `refresh_activity` whenever they cannot withdraw but still want to signal presence (vacations, sabbaticals, etc.).
- After calling `close_stream`, both the stream and vault PDAs are gone. Any subsequent instruction attempts will need a brand new stream.

This guide should equip you with both the conceptual understanding of the program and the practical steps needed to drive it from the generated JavaScript client.
