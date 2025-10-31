# Hackathon Devnet Production Setup

This guide explains how to deploy Cascade to production (e.g., Vercel) while using Solana devnet for your hackathon project.

## Overview

By default, the dev faucet (automatic USDC/USDT minting) is disabled in production environments for security. However, for hackathons where you want to showcase the platform on devnet with automatic token top-ups, you can enable it via environment variables.

## Quick Setup

### 1. Create Your Token Mints on Devnet

```bash
# Set cluster to devnet
solana config set --url devnet

# Create a mint authority keypair
solana-keygen new --outfile ~/.config/solana/faucet-authority.json

# Fund the authority
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/faucet-authority.json)

# Create USDC mint (6 decimals)
USDC_MINT=$(spl-token create-token --decimals 6 | grep -oP 'Creating token \K[^\s]+')
echo "USDC Mint: $USDC_MINT"

# Create USDT mint (6 decimals)
USDT_MINT=$(spl-token create-token --decimals 6 | grep -oP 'Creating token \K[^\s]+')
echo "USDT Mint: $USDT_MINT"
```

### 2. Convert Keypair to Base58

```javascript
// convert-keypair.js
import { readFileSync } from 'fs';

import bs58 from 'bs58';

const keypairJson = JSON.parse(readFileSync(process.env.HOME + '/.config/solana/faucet-authority.json', 'utf-8'));
const keypairArray = new Uint8Array(keypairJson);
const base58Key = bs58.encode(keypairArray);
console.log('Base58 Keypair:', base58Key);
```

Run: `node convert-keypair.js`

### 3. Configure Environment Variables

#### For Local Development (.env.local)

```bash
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/cascade
RESEND_API_KEY=your-resend-api-key

# Enable dev faucet in production
CASCADE_ENABLE_DEV_FAUCET=true
NEXT_PUBLIC_CASCADE_ENABLE_DEV_FAUCET=true

# Mint authority keypair (base58 encoded)
CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR=<YOUR_BASE58_KEYPAIR>

# USDC Configuration
CASCADE_DEV_FAUCET_USDC_MINT=<YOUR_USDC_MINT_ADDRESS>
CASCADE_DEV_FAUCET_USDC_DECIMALS=6
CASCADE_DEV_FAUCET_USDC_TOKEN_PROGRAM=token

# USDT Configuration
CASCADE_DEV_FAUCET_USDT_MINT=<YOUR_USDT_MINT_ADDRESS>
CASCADE_DEV_FAUCET_USDT_DECIMALS=6
CASCADE_DEV_FAUCET_USDT_TOKEN_PROGRAM=token

# Cluster URLs
CASCADE_SOLANA_DEVNET_RPC=https://api.devnet.solana.com
```

#### For Production Deployment (Vercel/Netlify)

Add these environment variables in your hosting platform's dashboard:

**Server Variables (Private):**

- `CASCADE_ENABLE_DEV_FAUCET=true`
- `CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR=<base58-keypair>`
- `CASCADE_DEV_FAUCET_USDC_MINT=<mint-address>`
- `CASCADE_DEV_FAUCET_USDC_DECIMALS=6`
- `CASCADE_DEV_FAUCET_USDC_TOKEN_PROGRAM=token`
- `CASCADE_DEV_FAUCET_USDT_MINT=<mint-address>`
- `CASCADE_DEV_FAUCET_USDT_DECIMALS=6`
- `CASCADE_DEV_FAUCET_USDT_TOKEN_PROGRAM=token`
- `CASCADE_SOLANA_DEVNET_RPC=https://api.devnet.solana.com`

**Client Variables (Public):**

- `NEXT_PUBLIC_CASCADE_ENABLE_DEV_FAUCET=true`

### 4. Ensure Mint Authority Has Sufficient SOL

The mint authority needs SOL to pay for transaction fees:

```bash
# Check balance
solana balance <MINT_AUTHORITY_PUBLIC_KEY> --url devnet

# Airdrop if needed
solana airdrop 2 <MINT_AUTHORITY_PUBLIC_KEY> --url devnet
```

For continuous operation, monitor and top up as needed.

## How It Works

### User Flow

1. User connects wallet to your deployed app
2. Clicks "Top Up Account" in dashboard
3. Selects USDC, USDT, or SOL
4. Enters amount
5. System automatically mints tokens to their wallet
6. User can immediately create payment streams

### Technical Flow

```
User Request
    ↓
Frontend Modal (with NEXT_PUBLIC_CASCADE_ENABLE_DEV_FAUCET check)
    ↓
Server Action (with CASCADE_ENABLE_DEV_FAUCET check)
    ↓
Load Mint Authority Keypair
    ↓
Build & Sign Mint Transaction
    ↓
Send to Devnet
    ↓
Success → Update UI & Log Activity
```

## Security Considerations

### ✅ Safe for Hackathons

- Only works on **devnet/localnet** (not mainnet)
- Mints have **no real value**
- Controlled via environment variables
- Can be disabled instantly

### ⚠️ Important Notes

1. **Keypair Security**: Keep `CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR` private
2. **Rate Limiting**: Consider adding rate limits if needed
3. **Monitoring**: Monitor mint authority SOL balance
4. **Post-Hackathon**: Disable by setting `CASCADE_ENABLE_DEV_FAUCET=false`

## Vercel Deployment Example

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables via CLI
vercel env add CASCADE_ENABLE_DEV_FAUCET production
# Enter: true

vercel env add CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR production
# Paste your base58 keypair

vercel env add CASCADE_DEV_FAUCET_USDC_MINT production
# Enter your USDC mint address

# ... repeat for all variables

# Redeploy to apply changes
vercel --prod
```

Or set variables via Vercel Dashboard:

1. Go to your project → Settings → Environment Variables
2. Add all variables listed above
3. Redeploy

## Testing

### Verify Setup

```bash
# Test the faucet endpoint (after deployment)
curl -X POST https://your-app.vercel.app/api/test-faucet \
  -H "Content-Type: application/json" \
  -d '{
    "token": "USDC",
    "amount": 100,
    "recipient": "YOUR_WALLET_ADDRESS"
  }'
```

### User Testing Flow

1. Connect wallet
2. Click "Top Up Account"
3. Select USDC, enter 1000
4. Click "Confirm Top Up"
5. Should see success toast with transaction signature
6. Check balance updates in dashboard

## Troubleshooting

### "Dev faucets are disabled in production"

- Ensure `CASCADE_ENABLE_DEV_FAUCET=true` is set
- Ensure `NEXT_PUBLIC_CASCADE_ENABLE_DEV_FAUCET=true` is set
- Redeploy after adding environment variables

### "Mint authority keypair is missing"

- Verify `CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR` is set correctly
- Ensure it's base58 encoded (not JSON array)
- Check there are no extra spaces or quotes

### "Failed to mint dev tokens"

- Check mint authority has sufficient SOL: `solana balance <address> --url devnet`
- Verify mint addresses are correct
- Check RPC connection: `CASCADE_SOLANA_DEVNET_RPC`
- Ensure you're using devnet cluster in your app

### Transaction Fails

- Mint authority might need more SOL
- Check RPC endpoint is responding
- Verify user's wallet is on devnet

## Cleanup After Hackathon

Once your hackathon is over:

1. **Disable the faucet**:

   ```bash
   # In Vercel dashboard or via CLI
   CASCADE_ENABLE_DEV_FAUCET=false
   NEXT_PUBLIC_CASCADE_ENABLE_DEV_FAUCET=false
   ```

2. **Remove sensitive variables** (optional):
   - `CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR`

3. **Add notice** to your app about moving to mainnet or requiring manual funding

## Resources

- [Solana Devnet Faucet](https://faucet.solana.com/)
- [SPL Token CLI Docs](https://spl.solana.com/token)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Happy Hacking! 🚀**
