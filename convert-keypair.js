import { readFileSync } from 'fs';

import bs58 from 'bs58';

const keypairJson = JSON.parse(readFileSync(process.env.HOME + '/.config/solana/faucet-authority.json', 'utf-8'));
const keypairArray = new Uint8Array(keypairJson);
const base58Key = bs58.encode(keypairArray);
console.log('Base58 Keypair:', base58Key);
