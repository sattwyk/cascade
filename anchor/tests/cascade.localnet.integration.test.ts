import {
  airdropFactory,
  createSolanaClient,
  createTransaction,
  generateKeyPairSigner,
  getMinimumBalanceForRentExemption,
  lamports,
  type Address,
  type Instruction,
  type TransactionSigner,
} from 'gill';
import { getCreateAccountInstruction } from 'gill/programs';
import {
  fetchMaybeToken,
  getAssociatedTokenAccountAddress,
  getCreateAssociatedTokenIdempotentInstruction,
  getInitializeMint2Instruction,
  getMintSize,
  getMintToInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from 'gill/programs/token';
import { beforeAll, describe, expect, test } from 'vitest';

import {
  fetchPaymentStream,
  getCloseStreamInstruction,
  getCreateStreamInstructionAsync,
  getEmployerEmergencyWithdrawInstruction,
  getTopUpStreamInstruction,
  getWithdrawInstruction,
} from '@project/anchor';

import { derivePaymentStream, deriveVault } from '@/features/streams/client/utils/derive-cascade-pdas';

const LOCALNET_RPC_URL =
  process.env.ANCHOR_PROVIDER_URL ?? process.env.CASCADE_SOLANA_LOCALNET_RPC ?? 'http://127.0.0.1:8899';
const shouldRunLocalnetIntegration =
  process.env.CASCADE_RUN_LOCALNET_TESTS === '1' ||
  Boolean(
    process.env.ANCHOR_PROVIDER_URL &&
    (process.env.ANCHOR_PROVIDER_URL.includes('127.0.0.1') || process.env.ANCHOR_PROVIDER_URL.includes('localhost')),
  );

type LocalnetFixture = {
  client: ReturnType<typeof createSolanaClient>;
  employer: TransactionSigner;
  employee: TransactionSigner;
  attacker: TransactionSigner;
  supportedMint: Address;
  unsupportedMint: Address;
  employerAtaForSupportedMint: Address;
  employerAtaForUnsupportedMint: Address;
  attackerAtaForSupportedMint: Address;
  stream: Address;
  vault: Address;
};

type InvariantFixture = {
  client: ReturnType<typeof createSolanaClient>;
  employer: TransactionSigner;
  employee: TransactionSigner;
  mint: Address;
  employerTokenAccount: Address;
  employeeTokenAccount: Address;
  stream: Address;
  vault: Address;
};

const UNSUPPORTED_MINT_DECIMALS_PATTERN =
  /UnsupportedMintDecimals|Only 6-decimal stablecoin mints are supported|custom program error: #6009/i;
const INVALID_TOKEN_ACCOUNT_PATTERN =
  /InvalidTokenAccount|Provided token account does not match expected owner or mint|ConstraintRaw|ConstraintTokenOwner|ConstraintOwner/i;
const STREAM_STILL_ACTIVE_PATTERN = /StreamStillActive|Stream is still active and cannot be closed/i;
const EMPLOYEE_STILL_ACTIVE_PATTERN =
  /EmployeeStillActive|Employee is still active, cannot perform emergency withdrawal/i;

type FailureDetails = {
  codes: Array<number>;
  details: string;
};

async function sendInstructions(
  client: ReturnType<typeof createSolanaClient>,
  feePayer: TransactionSigner,
  instructions: Instruction | readonly Instruction[],
) {
  const latestBlockhash = await client.rpc.getLatestBlockhash().send();
  const transaction = createTransaction({
    feePayer,
    version: 0,
    latestBlockhash: latestBlockhash.value,
    instructions: Array.isArray(instructions) ? instructions : [instructions],
  });
  return client.sendAndConfirmTransaction(transaction, { commitment: 'confirmed' });
}

function extractFailureDetails(thrownObject: unknown): FailureDetails {
  const visited = new Set<object>();
  const queue: Array<unknown> = [thrownObject];
  const details = new Set<string>();
  const codes = new Set<number>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (typeof current === 'string') {
      details.add(current);
      continue;
    }
    if (!current || typeof current !== 'object') {
      continue;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const record = current as Record<string, unknown>;
    if (typeof record.message === 'string') {
      details.add(record.message);
    }
    if (typeof record.stack === 'string') {
      details.add(record.stack);
    }

    const context = record.context;
    if (context && typeof context === 'object') {
      const contextRecord = context as Record<string, unknown>;

      if (typeof contextRecord.__code === 'number') {
        codes.add(contextRecord.__code);
      }
      if (typeof contextRecord.code === 'number') {
        codes.add(contextRecord.code);
      }
      if (typeof contextRecord.__serverMessage === 'string') {
        details.add(contextRecord.__serverMessage);
      }
      if (Array.isArray(contextRecord.logs)) {
        for (const logLine of contextRecord.logs) {
          if (typeof logLine === 'string') {
            details.add(logLine);
          }
        }
      }
    }

    if ('cause' in record) {
      queue.push(record.cause);
    }
  }

  return {
    codes: [...codes],
    details: [...details].join('\n'),
  };
}

async function captureFailureDetails(promise: Promise<unknown>): Promise<FailureDetails> {
  try {
    await promise;
    return { codes: [], details: '' };
  } catch (error) {
    return extractFailureDetails(error);
  }
}

function assertFailureMatches(details: FailureDetails, expectedPattern: RegExp, label: string) {
  expect(
    expectedPattern.test(details.details),
    `Expected ${label} in failure details, got codes [${details.codes.join(', ')}]\n${details.details}`,
  ).toBe(true);
}

async function createMint(
  client: ReturnType<typeof createSolanaClient>,
  authority: TransactionSigner,
  { decimals }: { decimals: number },
): Promise<Address> {
  const mint = await generateKeyPairSigner();
  const mintSize = getMintSize();
  const createMintAccountInstruction = getCreateAccountInstruction({
    payer: authority,
    newAccount: mint,
    lamports: getMinimumBalanceForRentExemption(mintSize),
    space: mintSize,
    programAddress: TOKEN_PROGRAM_ADDRESS,
  });
  const initializeMintInstruction = getInitializeMint2Instruction(
    {
      mint: mint.address,
      decimals,
      mintAuthority: authority.address,
      freezeAuthority: null,
    },
    { programAddress: TOKEN_PROGRAM_ADDRESS },
  );

  await sendInstructions(client, authority, [createMintAccountInstruction, initializeMintInstruction]);
  return mint.address;
}

async function mintToOwner(
  client: ReturnType<typeof createSolanaClient>,
  authority: TransactionSigner,
  mint: Address,
  owner: Address,
  amount: bigint,
): Promise<Address> {
  const ata = await getAssociatedTokenAccountAddress(mint, owner, TOKEN_PROGRAM_ADDRESS);
  const createAssociatedTokenAccountInstruction = getCreateAssociatedTokenIdempotentInstruction({
    payer: authority,
    ata,
    owner,
    mint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  const mintToInstruction = getMintToInstruction(
    {
      mint,
      token: ata,
      mintAuthority: authority,
      amount,
    },
    { programAddress: TOKEN_PROGRAM_ADDRESS },
  );

  await sendInstructions(client, authority, [createAssociatedTokenAccountInstruction, mintToInstruction]);
  return ata;
}

function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };
}

async function assertStreamAndVaultInvariants(fixture: InvariantFixture) {
  const streamAccount = await fetchPaymentStream(fixture.client.rpc, fixture.stream);
  const vaultAccount = await fetchMaybeToken(fixture.client.rpc, fixture.vault);

  expect(vaultAccount.exists).toBe(true);
  expect(streamAccount.data.withdrawnAmount <= streamAccount.data.totalDeposited).toBe(true);

  if (!vaultAccount.exists) {
    return;
  }

  const expectedVaultBalance = streamAccount.data.totalDeposited - streamAccount.data.withdrawnAmount;
  expect(vaultAccount.data.amount).toBe(expectedVaultBalance);
}

describe.runIf(shouldRunLocalnetIntegration)('cascade localnet integration: account constraints', () => {
  let fixture: LocalnetFixture;

  beforeAll(async () => {
    const client = createSolanaClient({ urlOrMoniker: LOCALNET_RPC_URL });
    const airdrop = airdropFactory(client);

    const employer = await generateKeyPairSigner();
    const employee = await generateKeyPairSigner();
    const attacker = await generateKeyPairSigner();

    await Promise.all([
      airdrop({
        recipientAddress: employer.address,
        lamports: lamports(4_000_000_000n),
        commitment: 'confirmed',
      }),
      airdrop({
        recipientAddress: employee.address,
        lamports: lamports(2_000_000_000n),
        commitment: 'confirmed',
      }),
      airdrop({
        recipientAddress: attacker.address,
        lamports: lamports(2_000_000_000n),
        commitment: 'confirmed',
      }),
    ]);

    const supportedMint = await createMint(client, employer, { decimals: 6 });
    const unsupportedMint = await createMint(client, employer, { decimals: 9 });

    const employerAtaForSupportedMint = await mintToOwner(
      client,
      employer,
      supportedMint,
      employer.address,
      50_000_000n,
    );
    const employerAtaForUnsupportedMint = await mintToOwner(
      client,
      employer,
      unsupportedMint,
      employer.address,
      50_000_000_000n,
    );
    const attackerAtaForSupportedMint = await mintToOwner(
      client,
      employer,
      supportedMint,
      attacker.address,
      5_000_000n,
    );

    const [stream] = await derivePaymentStream(employer.address, employee.address);
    const [vault] = await deriveVault(stream);
    const createStreamInstruction = await getCreateStreamInstructionAsync({
      employer,
      employee: employee.address,
      mint: supportedMint,
      employerTokenAccount: employerAtaForSupportedMint,
      stream,
      vault,
      hourlyRate: 1_000_000n,
      totalDeposit: 10_000_000n,
    });
    await sendInstructions(client, employer, createStreamInstruction);

    fixture = {
      client,
      employer,
      employee,
      attacker,
      supportedMint,
      unsupportedMint,
      employerAtaForSupportedMint,
      employerAtaForUnsupportedMint,
      attackerAtaForSupportedMint,
      stream,
      vault,
    };
  }, 180_000);

  test('create_stream rejects unsupported mint decimals', async () => {
    const employeeForUnsupportedMint = await generateKeyPairSigner();
    const [stream] = await derivePaymentStream(fixture.employer.address, employeeForUnsupportedMint.address);
    const [vault] = await deriveVault(stream);

    const instruction = await getCreateStreamInstructionAsync({
      employer: fixture.employer,
      employee: employeeForUnsupportedMint.address,
      mint: fixture.unsupportedMint,
      employerTokenAccount: fixture.employerAtaForUnsupportedMint,
      stream,
      vault,
      hourlyRate: 1_000_000n,
      totalDeposit: 5_000_000n,
    });

    const failure = await captureFailureDetails(sendInstructions(fixture.client, fixture.employer, instruction));
    assertFailureMatches(failure, UNSUPPORTED_MINT_DECIMALS_PATTERN, 'unsupported mint decimals failure');
  });

  test('top_up_stream rejects token account not owned by employer', async () => {
    const instruction = getTopUpStreamInstruction({
      employer: fixture.employer,
      stream: fixture.stream,
      mint: fixture.supportedMint,
      vault: fixture.vault,
      employerTokenAccount: fixture.attackerAtaForSupportedMint,
      additionalAmount: 1n,
    });

    const failure = await captureFailureDetails(sendInstructions(fixture.client, fixture.employer, instruction));
    assertFailureMatches(failure, INVALID_TOKEN_ACCOUNT_PATTERN, 'invalid token account failure');
  });

  test('withdraw rejects destination token account not owned by employee', async () => {
    const instruction = getWithdrawInstruction({
      employee: fixture.employee,
      stream: fixture.stream,
      mint: fixture.supportedMint,
      vault: fixture.vault,
      employeeTokenAccount: fixture.attackerAtaForSupportedMint,
      amount: 0n,
    });

    const failure = await captureFailureDetails(sendInstructions(fixture.client, fixture.employee, instruction));
    assertFailureMatches(failure, INVALID_TOKEN_ACCOUNT_PATTERN, 'invalid token account failure');
  });

  test('close_stream enforces destination ownership constraint before active-stream check', async () => {
    const instruction = getCloseStreamInstruction({
      employer: fixture.employer,
      stream: fixture.stream,
      mint: fixture.supportedMint,
      vault: fixture.vault,
      employerTokenAccount: fixture.attackerAtaForSupportedMint,
    });

    const failure = await captureFailureDetails(sendInstructions(fixture.client, fixture.employer, instruction));
    assertFailureMatches(failure, INVALID_TOKEN_ACCOUNT_PATTERN, 'invalid token account failure');
    expect(failure.details).not.toMatch(STREAM_STILL_ACTIVE_PATTERN);
  });

  test('employer_emergency_withdraw enforces destination ownership constraint before inactivity check', async () => {
    const instruction = getEmployerEmergencyWithdrawInstruction({
      employer: fixture.employer,
      stream: fixture.stream,
      mint: fixture.supportedMint,
      vault: fixture.vault,
      employerTokenAccount: fixture.attackerAtaForSupportedMint,
    });

    const failure = await captureFailureDetails(sendInstructions(fixture.client, fixture.employer, instruction));
    assertFailureMatches(failure, INVALID_TOKEN_ACCOUNT_PATTERN, 'invalid token account failure');
    expect(failure.details).not.toMatch(EMPLOYEE_STILL_ACTIVE_PATTERN);
  });
});

describe.runIf(shouldRunLocalnetIntegration)('cascade localnet integration: stream accounting invariants', () => {
  let fixture: InvariantFixture;

  beforeAll(async () => {
    const client = createSolanaClient({ urlOrMoniker: LOCALNET_RPC_URL });
    const airdrop = airdropFactory(client);

    const employer = await generateKeyPairSigner();
    const employee = await generateKeyPairSigner();

    await Promise.all([
      airdrop({
        recipientAddress: employer.address,
        lamports: lamports(4_000_000_000n),
        commitment: 'confirmed',
      }),
      airdrop({
        recipientAddress: employee.address,
        lamports: lamports(2_000_000_000n),
        commitment: 'confirmed',
      }),
    ]);

    const mint = await createMint(client, employer, { decimals: 6 });
    const employerTokenAccount = await mintToOwner(client, employer, mint, employer.address, 250_000_000n);
    const employeeTokenAccount = await getAssociatedTokenAccountAddress(mint, employee.address, TOKEN_PROGRAM_ADDRESS);
    const createEmployeeAtaInstruction = getCreateAssociatedTokenIdempotentInstruction({
      payer: employer,
      ata: employeeTokenAccount,
      owner: employee.address,
      mint,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    await sendInstructions(client, employer, createEmployeeAtaInstruction);

    const [stream] = await derivePaymentStream(employer.address, employee.address);
    const [vault] = await deriveVault(stream);
    const createStreamInstruction = await getCreateStreamInstructionAsync({
      employer,
      employee: employee.address,
      mint,
      employerTokenAccount,
      stream,
      vault,
      hourlyRate: 1_000_000n,
      totalDeposit: 20_000_000n,
    });
    await sendInstructions(client, employer, createStreamInstruction);

    fixture = {
      client,
      employer,
      employee,
      mint,
      employerTokenAccount,
      employeeTokenAccount,
      stream,
      vault,
    };
  }, 180_000);

  test('maintains stream and vault invariants across randomized top-ups and withdrawals', async () => {
    const operationCount = 24;
    const maxTopUpAmount = 900_000;
    const minTopUpAmount = 1_000;
    const nextRandom = createDeterministicRandom(0xcafe42);

    await assertStreamAndVaultInvariants(fixture);

    for (let operationIndex = 0; operationIndex < operationCount; operationIndex += 1) {
      const runTopUp = (nextRandom() & 1) === 0;

      if (runTopUp) {
        const additionalAmount = BigInt(nextRandom() % maxTopUpAmount) + BigInt(minTopUpAmount);
        const topUpInstruction = getTopUpStreamInstruction({
          employer: fixture.employer,
          stream: fixture.stream,
          mint: fixture.mint,
          vault: fixture.vault,
          employerTokenAccount: fixture.employerTokenAccount,
          additionalAmount,
        });
        await sendInstructions(fixture.client, fixture.employer, topUpInstruction);
      } else {
        const withdrawInstruction = getWithdrawInstruction({
          employee: fixture.employee,
          stream: fixture.stream,
          mint: fixture.mint,
          vault: fixture.vault,
          employeeTokenAccount: fixture.employeeTokenAccount,
          amount: 0n,
        });
        await sendInstructions(fixture.client, fixture.employee, withdrawInstruction);
      }

      await assertStreamAndVaultInvariants(fixture);
    }
  }, 180_000);
});
