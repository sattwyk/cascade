'use server';

import { address, createSolanaClient, type Address } from 'gill';
import { loadKeypairSignerFromEnvironmentBase58 } from 'gill/node';
import {
  buildMintTokensTransaction,
  getAssociatedTokenAccountAddress,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  tokenUiAmountToAmount,
  type TokenProgramMonikers,
} from 'gill/programs/token';
import { z } from 'zod';

const SUPPORTED_TOKENS = ['USDC', 'USDT', 'EURC'] as const;

type SupportedToken = (typeof SUPPORTED_TOKENS)[number];

type ClusterMoniker = 'devnet' | 'localnet';

type TokenMintConfig = {
  mintAddress?: string;
  decimals?: number;
  tokenProgram?: TokenProgramMonikers | string;
};

const TOKEN_ENV_CONFIG: Record<SupportedToken, TokenMintConfig> = {
  USDC: {
    mintAddress: process.env.CASCADE_DEV_FAUCET_USDC_MINT,
    decimals: parseEnvInt('CASCADE_DEV_FAUCET_USDC_DECIMALS'),
    tokenProgram: process.env.CASCADE_DEV_FAUCET_USDC_TOKEN_PROGRAM,
  },
  USDT: {
    mintAddress: process.env.CASCADE_DEV_FAUCET_USDT_MINT,
    decimals: parseEnvInt('CASCADE_DEV_FAUCET_USDT_DECIMALS'),
    tokenProgram: process.env.CASCADE_DEV_FAUCET_USDT_TOKEN_PROGRAM,
  },
  EURC: {
    mintAddress: process.env.CASCADE_DEV_FAUCET_EURC_MINT,
    decimals: parseEnvInt('CASCADE_DEV_FAUCET_EURC_DECIMALS'),
    tokenProgram: process.env.CASCADE_DEV_FAUCET_EURC_TOKEN_PROGRAM,
  },
};

const DEFAULT_DECIMALS = 6;
const DEFAULT_LOCALNET_RPC = process.env.CASCADE_SOLANA_LOCALNET_RPC ?? 'http://127.0.0.1:8899';
const DEFAULT_DEVNET_RPC = process.env.CASCADE_SOLANA_DEVNET_RPC ?? 'devnet';
const MINT_AUTHORITY_ENV = process.env.CASCADE_DEV_FAUCET_AUTHORITY_VAR ?? 'CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR';
const ENABLE_DEV_FAUCET = process.env.CASCADE_ENABLE_DEV_FAUCET === 'true';

const inputSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  token: z.enum(SUPPORTED_TOKENS),
  recipient: z.string().min(1, 'Recipient is required'),
  cluster: z.enum(['devnet', 'localnet']).default('devnet'),
});

export type RequestDevTokenTopUpInput = z.infer<typeof inputSchema>;

export type RequestDevTokenTopUpResult =
  | {
      ok: true;
      signature: string;
      token: SupportedToken;
      amount: number;
      amountRaw: string;
      mint: string;
      cluster: ClusterMoniker;
    }
  | {
      ok: false;
      error:
        | 'unsupported-environment'
        | 'invalid-input'
        | 'missing-config'
        | 'mint-authority-unavailable'
        | 'mint-failed';
      message: string;
      cause?: string;
    };

export async function requestDevTokenTopUp(input: RequestDevTokenTopUpInput): Promise<RequestDevTokenTopUpResult> {
  // For hackathons: Allow dev faucet in production if explicitly enabled
  if (process.env.NODE_ENV === 'production' && !ENABLE_DEV_FAUCET) {
    return {
      ok: false,
      error: 'unsupported-environment',
      message:
        'Dev faucets are disabled in production. Set CASCADE_ENABLE_DEV_FAUCET=true to enable for devnet deployments.',
    };
  }

  let parsed: RequestDevTokenTopUpInput;
  try {
    parsed = inputSchema.parse(input);
  } catch (error) {
    return {
      ok: false,
      error: 'invalid-input',
      message: 'Invalid top up request.',
      cause: error instanceof Error ? error.message : undefined,
    };
  }

  const config = TOKEN_ENV_CONFIG[parsed.token];
  if (!config?.mintAddress) {
    return {
      ok: false,
      error: 'missing-config',
      message: `Set the ${envVarNameForToken(parsed.token)} environment variable to enable ${parsed.token} top ups.`,
    };
  }

  let mintAuthority;
  try {
    mintAuthority = await loadKeypairSignerFromEnvironmentBase58(MINT_AUTHORITY_ENV);
  } catch (error) {
    return {
      ok: false,
      error: 'mint-authority-unavailable',
      message: `Mint authority keypair is missing. Ensure ${MINT_AUTHORITY_ENV} is set.`,
      cause: error instanceof Error ? error.message : undefined,
    };
  }

  let recipientAddress: Address;
  let mintAddress: Address;
  try {
    recipientAddress = address(parsed.recipient);
    mintAddress = address(config.mintAddress);
  } catch (error) {
    return {
      ok: false,
      error: 'invalid-input',
      message: 'Recipient or mint address is invalid.',
      cause: error instanceof Error ? error.message : undefined,
    };
  }

  const client = createSolanaClient({ urlOrMoniker: resolveClusterUrl(parsed.cluster) });
  const decimals = Number.isFinite(config.decimals) ? Number(config.decimals) : DEFAULT_DECIMALS;
  const rawAmount = tokenUiAmountToAmount(parsed.amount, decimals);

  const tokenProgramAddress = config.tokenProgram ? addressOrMoniker(config.tokenProgram) : TOKEN_PROGRAM_ADDRESS;

  try {
    const [latestBlockhash, ata] = await Promise.all([
      client.rpc.getLatestBlockhash().send(),
      getAssociatedTokenAccountAddress(mintAddress, recipientAddress, tokenProgramAddress),
    ]);

    const transaction = await buildMintTokensTransaction({
      feePayer: mintAuthority,
      latestBlockhash: latestBlockhash.value,
      mint: mintAddress,
      mintAuthority,
      amount: rawAmount,
      destination: recipientAddress,
      ata,
      tokenProgram: tokenProgramAddress,
    });

    const signature = await client.sendAndConfirmTransaction(transaction, {
      commitment: 'confirmed',
    });

    return {
      ok: true,
      signature,
      token: parsed.token,
      amount: parsed.amount,
      amountRaw: rawAmount.toString(),
      mint: config.mintAddress,
      cluster: parsed.cluster,
    };
  } catch (error) {
    return {
      ok: false,
      error: 'mint-failed',
      message: 'Failed to mint dev tokens. Check your RPC connection and mint authority balance.',
      cause: error instanceof Error ? error.message : undefined,
    };
  }
}

function envVarNameForToken(token: SupportedToken) {
  return token === 'USDC' ? 'CASCADE_DEV_FAUCET_USDC_MINT' : 'CASCADE_DEV_FAUCET_USDT_MINT';
}

function resolveClusterUrl(cluster: ClusterMoniker): string {
  if (cluster === 'localnet') {
    return DEFAULT_LOCALNET_RPC;
  }
  return DEFAULT_DEVNET_RPC;
}

function parseEnvInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : undefined;
}

function addressOrMoniker(value: TokenProgramMonikers | string): Address {
  if (value === 'token') {
    return TOKEN_PROGRAM_ADDRESS;
  }
  if (value === 'token-2022') {
    return TOKEN_2022_PROGRAM_ADDRESS;
  }
  return address(value);
}
