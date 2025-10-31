import { address, getAddressEncoder, getBytesEncoder, getProgramDerivedAddress, type Address } from 'gill';

import { CASCADE_PROGRAM_ADDRESS } from '@project/anchor';

const streamSeed = getBytesEncoder().encode(new Uint8Array([115, 116, 114, 101, 97, 109])); // "stream"
const vaultSeed = getBytesEncoder().encode(new Uint8Array([118, 97, 117, 108, 116])); // "vault"

type AddressLike = Address | string;

function ensureAddress(value: AddressLike): Address {
  return typeof value === 'string' ? address(value) : value;
}

/**
 * Converts a number or bigint to bigint for safe Solana amount handling
 */
export function toBigInt(value: number | bigint): bigint {
  return typeof value === 'bigint' ? value : BigInt(Math.floor(value));
}

/**
 * Gets error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    // Handle wallet extension errors
    if ('message' in error) return String(error.message);
    if ('reason' in error) return String(error.reason);
    if ('name' in error && 'message' in error) {
      return `${String(error.name)}: ${String(error.message)}`;
    }
  }
  if (typeof error === 'string') return error;
  // Last resort: stringify the error
  return JSON.stringify(error) || 'Operation failed';
}

export async function derivePaymentStream(employer: AddressLike, employee: AddressLike) {
  const employerAddress = ensureAddress(employer);
  const employeeAddress = ensureAddress(employee);

  return getProgramDerivedAddress({
    programAddress: CASCADE_PROGRAM_ADDRESS,
    seeds: [streamSeed, getAddressEncoder().encode(employerAddress), getAddressEncoder().encode(employeeAddress)],
  });
}

export async function deriveVault(stream: AddressLike) {
  const streamAddress = ensureAddress(stream);

  return getProgramDerivedAddress({
    programAddress: CASCADE_PROGRAM_ADDRESS,
    seeds: [vaultSeed, getAddressEncoder().encode(streamAddress)],
  });
}
