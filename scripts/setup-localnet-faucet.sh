#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"

LOCALNET_RPC="${CASCADE_SOLANA_LOCALNET_RPC:-http://127.0.0.1:8899}"
DEVNET_RPC="${CASCADE_SOLANA_DEVNET_RPC:-https://api.devnet.solana.com}"
FAUCET_KEYPAIR_PATH="${CASCADE_FAUCET_KEYPAIR_PATH:-$HOME/.config/solana/faucet-authority.json}"

BEGIN_MARKER="# >>> cascade localnet faucet setup >>>"
END_MARKER="# <<< cascade localnet faucet setup <<<"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

read_env_value() {
  local file="$1"
  local key="$2"
  if [ ! -f "$file" ]; then
    return 0
  fi

  local line
  line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
  if [ -z "$line" ]; then
    return 0
  fi

  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

ensure_localnet_available() {
  if ! solana cluster-version --url "$LOCALNET_RPC" >/dev/null 2>&1; then
    echo "Localnet RPC is not reachable at $LOCALNET_RPC"
    echo "Start localnet first with: pnpm run anchor-localnet"
    exit 1
  fi
}

ensure_faucet_keypair() {
  mkdir -p "$(dirname "$FAUCET_KEYPAIR_PATH")"
  if [ ! -f "$FAUCET_KEYPAIR_PATH" ]; then
    echo "Creating faucet authority keypair at $FAUCET_KEYPAIR_PATH"
    solana-keygen new --no-bip39-passphrase -o "$FAUCET_KEYPAIR_PATH" >/dev/null
  fi
}

to_base58_keypair() {
  FAUCET_KEYPAIR_PATH="$FAUCET_KEYPAIR_PATH" pnpm exec node -e \
    "const fs=require('fs');const m=require('bs58');const bs58=m.default??m;const p=process.env.FAUCET_KEYPAIR_PATH;const a=JSON.parse(fs.readFileSync(p,'utf8'));console.log(bs58.encode(Uint8Array.from(a)));"
}

ensure_mint() {
  local key="$1"
  local label="$2"
  local existing
  existing="$(read_env_value "$ENV_FILE" "$key")"

  if [ -n "$existing" ] && spl-token --url "$LOCALNET_RPC" supply "$existing" >/dev/null 2>&1; then
    echo "$existing"
    return 0
  fi

  echo "Creating $label mint on localnet..."
  local created
  created="$(spl-token --url "$LOCALNET_RPC" create-token --decimals 6 --mint-authority "$FAUCET_KEYPAIR_PATH" | awk '/^Address:/{print $2; exit}')"
  if [ -z "$created" ]; then
    echo "Failed to create $label mint."
    exit 1
  fi
  echo "$created"
}

write_env_block() {
  local faucet_keypair_base58="$1"
  local usdc_mint="$2"
  local usdt_mint="$3"
  local temp_file
  temp_file="$(mktemp)"

  if [ -f "$ENV_FILE" ]; then
    awk -v begin="$BEGIN_MARKER" -v end="$END_MARKER" '
      $0 == begin { skip = 1; next }
      $0 == end { skip = 0; next }
      !skip { print }
    ' "$ENV_FILE" >"$temp_file"
  else
    : >"$temp_file"
  fi

  {
    printf '\n%s\n' "$BEGIN_MARKER"
    printf 'CASCADE_ENABLE_DEV_FAUCET=true\n'
    printf 'NEXT_PUBLIC_CASCADE_ENABLE_DEV_FAUCET=true\n'
    printf 'CASCADE_DEV_FAUCET_AUTHORITY_KEYPAIR=%s\n' "$faucet_keypair_base58"
    printf 'CASCADE_DEV_FAUCET_USDC_MINT=%s\n' "$usdc_mint"
    printf 'CASCADE_DEV_FAUCET_USDC_DECIMALS=6\n'
    printf 'CASCADE_DEV_FAUCET_USDC_TOKEN_PROGRAM=token\n'
    printf 'CASCADE_DEV_FAUCET_USDT_MINT=%s\n' "$usdt_mint"
    printf 'CASCADE_DEV_FAUCET_USDT_DECIMALS=6\n'
    printf 'CASCADE_DEV_FAUCET_USDT_TOKEN_PROGRAM=token\n'
    printf 'CASCADE_SOLANA_LOCALNET_RPC=%s\n' "$LOCALNET_RPC"
    printf 'CASCADE_SOLANA_DEVNET_RPC=%s\n' "$DEVNET_RPC"
    printf '%s\n' "$END_MARKER"
  } >>"$temp_file"

  mv "$temp_file" "$ENV_FILE"
}

main() {
  require_command pnpm
  require_command solana
  require_command solana-keygen
  require_command spl-token
  require_command awk

  ensure_localnet_available
  ensure_faucet_keypair

  local faucet_pubkey
  faucet_pubkey="$(solana-keygen pubkey "$FAUCET_KEYPAIR_PATH")"
  solana airdrop 5 "$faucet_pubkey" --url "$LOCALNET_RPC" >/dev/null 2>&1 || true

  local faucet_keypair_base58
  faucet_keypair_base58="$(to_base58_keypair)"

  local usdc_mint
  local usdt_mint
  usdc_mint="$(ensure_mint "CASCADE_DEV_FAUCET_USDC_MINT" "USDC")"
  usdt_mint="$(ensure_mint "CASCADE_DEV_FAUCET_USDT_MINT" "USDT")"

  write_env_block "$faucet_keypair_base58" "$usdc_mint" "$usdt_mint"

  echo
  echo "Localnet faucet setup complete."
  echo "Env file updated: $ENV_FILE"
  echo "Faucet authority: $faucet_pubkey"
  echo "USDC mint: $usdc_mint"
  echo "USDT mint: $usdt_mint"
  echo
  echo "Next:"
  echo "1) Keep localnet running (pnpm run anchor-localnet)"
  echo "2) Restart app server (pnpm dev)"
  echo "3) In dashboard, switch cluster to localnet and use Top Up Account"
}

main "$@"
