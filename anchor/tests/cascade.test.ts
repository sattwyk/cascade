import { address, generateKeyPairSigner, type Address } from 'gill';
import { describe, expect, test } from 'vitest';

import {
  CASCADE_PROGRAM_ADDRESS,
  getCloseStreamInstruction,
  getCreateStreamInstructionAsync,
  type CloseStreamInstruction,
  type CreateStreamInstruction,
} from '@project/anchor';

import { derivePaymentStream, deriveVault, toBaseUnits } from '@/features/streams/client/utils/derive-cascade-pdas';

function getAccountAddress(accountMeta: { address?: Address } | Address): Address {
  if (typeof accountMeta === 'string') {
    return accountMeta;
  }

  if ('address' in accountMeta && accountMeta.address) {
    return accountMeta.address;
  }

  throw new Error('Instruction account is missing an address field');
}

describe('cascade instruction builders', () => {
  test('derives stream and vault PDAs consistently for createStream', async () => {
    const employer = await generateKeyPairSigner();
    const employee = await generateKeyPairSigner();
    const mint = (await generateKeyPairSigner()).address;
    const employerTokenAccount = (await generateKeyPairSigner()).address;

    const [expectedStream] = await derivePaymentStream(employer.address, employee.address);
    const [expectedVault] = await deriveVault(expectedStream);

    const instruction = (await getCreateStreamInstructionAsync({
      employer,
      employee: employee.address,
      mint,
      employerTokenAccount,
      hourlyRate: toBaseUnits(12.5, 6),
      totalDeposit: toBaseUnits(500, 6),
    })) as CreateStreamInstruction;

    const streamAccount = getAccountAddress(instruction.accounts[3]);
    const vaultAccount = getAccountAddress(instruction.accounts[4]);

    expect(streamAccount).toBe(expectedStream);
    expect(vaultAccount).toBe(expectedVault);
    expect(instruction.programAddress).toBe(CASCADE_PROGRAM_ADDRESS);
  });

  test('closeStream requires employer token account and preserves account order', async () => {
    const employer = await generateKeyPairSigner();
    const employee = await generateKeyPairSigner();
    const mint = (await generateKeyPairSigner()).address;
    const employerTokenAccount = (await generateKeyPairSigner()).address;

    const [stream] = await derivePaymentStream(employer.address, employee.address);
    const [vault] = await deriveVault(stream);

    const instruction = getCloseStreamInstruction({
      employer,
      stream,
      mint,
      vault,
      employerTokenAccount,
    }) as CloseStreamInstruction;

    expect(instruction.accounts).toHaveLength(6);
    expect(getAccountAddress(instruction.accounts[0])).toBe(employer.address);
    expect(getAccountAddress(instruction.accounts[1])).toBe(stream);
    expect(getAccountAddress(instruction.accounts[2])).toBe(mint);
    expect(getAccountAddress(instruction.accounts[3])).toBe(vault);
    expect(getAccountAddress(instruction.accounts[4])).toBe(employerTokenAccount);
  });

  test('converts UI amounts to base units using requested decimals', () => {
    expect(toBaseUnits(1.234567, 6)).toBe(1234567n);
    expect(toBaseUnits(1.23456789, 8)).toBe(123456789n);
    expect(toBaseUnits(42n, 6)).toBe(42n);
  });

  test('derives deterministic PDAs from string and address inputs', async () => {
    const employer = await generateKeyPairSigner();
    const employee = await generateKeyPairSigner();

    const [streamFromAddress] = await derivePaymentStream(employer.address, employee.address);
    const [streamFromString] = await derivePaymentStream(String(employer.address), String(employee.address));
    const [vaultFromAddress] = await deriveVault(streamFromAddress);
    const [vaultFromString] = await deriveVault(address(String(streamFromAddress)));

    expect(streamFromAddress).toBe(streamFromString);
    expect(vaultFromAddress).toBe(vaultFromString);
  });
});
