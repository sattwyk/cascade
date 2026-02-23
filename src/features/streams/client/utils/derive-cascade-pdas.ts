import { address, getAddressEncoder, getBytesEncoder, getProgramDerivedAddress, type Address } from 'gill';

import { CASCADE_PROGRAM_ADDRESS } from '@project/anchor';

const streamSeed = getBytesEncoder().encode(new Uint8Array([115, 116, 114, 101, 97, 109])); // "stream"
const vaultSeed = getBytesEncoder().encode(new Uint8Array([118, 97, 117, 108, 116])); // "vault"

type AddressLike = Address | string;

function ensureAddress(value: AddressLike): Address {
  return typeof value === 'string' ? address(value) : value;
}

const DEFAULT_TOKEN_DECIMALS = 6;

function toScaledBigInt(value: number, decimals: number): bigint {
  if (!Number.isFinite(value)) {
    throw new Error('Numeric values must be finite.');
  }

  const isNegative = value < 0;
  const normalized = Math.abs(value).toFixed(decimals);
  const [whole, fraction = ''] = normalized.split('.');
  const scale = 10n ** BigInt(decimals);
  const fractionValue = fraction.padEnd(decimals, '0').slice(0, decimals);

  const result = BigInt(whole) * scale + BigInt(fractionValue || '0');
  return isNegative ? -result : result;
}

/**
 * Converts a number or bigint to base units for safe Solana amount handling.
 * Defaults to 6 decimals for SPL tokens like USDC/USDT/EURC.
 */
export function toBaseUnits(value: number | bigint, decimals: number = DEFAULT_TOKEN_DECIMALS): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  return toScaledBigInt(value, decimals);
}

/**
 * Backwards-compatible alias for base unit conversion.
 */
export function toBigInt(value: number | bigint, decimals: number = DEFAULT_TOKEN_DECIMALS): bigint {
  return toBaseUnits(value, decimals);
}

/**
 * Gets error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message) return error.message;
    if (error.cause && error.cause !== error) {
      const causeMessage = getErrorMessage(error.cause);
      if (causeMessage) return causeMessage;
    }
  }
  if (typeof error === 'object' && error !== null) {
    const errorRecord = error as Record<string, unknown>;
    // Handle wallet extension errors
    if (typeof errorRecord.message === 'string' && errorRecord.message.trim()) return errorRecord.message;
    if (typeof errorRecord.reason === 'string' && errorRecord.reason.trim()) return errorRecord.reason;
    if (typeof errorRecord.error === 'string' && errorRecord.error.trim()) return errorRecord.error;
    if (errorRecord.cause && errorRecord.cause !== error) {
      const causeMessage = getErrorMessage(errorRecord.cause);
      if (causeMessage) return causeMessage;
    }
    if (errorRecord.error && errorRecord.error !== error) {
      const nestedMessage = getErrorMessage(errorRecord.error);
      if (nestedMessage) return nestedMessage;
    }
    if (typeof errorRecord.name === 'string' && typeof errorRecord.message === 'string' && errorRecord.message.trim()) {
      return `${errorRecord.name}: ${errorRecord.message}`;
    }
  }
  if (typeof error === 'string' && error.trim()) return error;
  // Last resort: stringify the error
  const serialized = safeJsonStringify(error);
  return serialized && serialized !== '{}' && serialized !== '[]' ? serialized : 'Operation failed';
}

function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
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
