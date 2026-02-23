import { address, type Address, type SolanaClient } from 'gill';
import { fetchMint } from 'gill/programs/token';

export const SUPPORTED_STABLECOIN_DECIMALS = 6;

type AddressLike = Address | string;

function asAddress(value: AddressLike): Address {
  return typeof value === 'string' ? address(value) : value;
}

export async function fetchMintDecimals(rpc: SolanaClient['rpc'], mint: AddressLike): Promise<number> {
  const mintAccount = await fetchMint(rpc, asAddress(mint));
  return Number(mintAccount.data.decimals);
}

export async function fetchAndValidateMintDecimals(rpc: SolanaClient['rpc'], mint: AddressLike): Promise<number> {
  const mintDecimals = await fetchMintDecimals(rpc, mint);
  if (mintDecimals !== SUPPORTED_STABLECOIN_DECIMALS) {
    throw new Error(
      `Unsupported mint decimals: ${mintDecimals}. Cascade currently supports ${SUPPORTED_STABLECOIN_DECIMALS}-decimal mints only.`,
    );
  }
  return mintDecimals;
}
