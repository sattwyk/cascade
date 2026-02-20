set shell := ["bash", "-euo", "pipefail", "-c"]

anchor_dir := "anchor"

default: help

# Show available recipes.
help:
    @just --list

# Verify required local tooling is installed.
doctor:
    command -v pnpm >/dev/null || (echo "Missing dependency: pnpm" && exit 1)
    command -v anchor >/dev/null || (echo "Missing dependency: anchor" && exit 1)
    command -v solana >/dev/null || (echo "Missing dependency: solana CLI" && exit 1)
    command -v rustc >/dev/null || (echo "Missing dependency: rustc" && exit 1)
    command -v cargo >/dev/null || (echo "Missing dependency: cargo" && exit 1)
    command -v docker >/dev/null || (echo "Missing dependency: docker" && exit 1)
    @echo "Local toolchain looks good."

# Install workspace dependencies.
install:
    pnpm install

# Create a local env file from .env.example if missing.
setup-env:
    if [ ! -f .env ]; then cp .env.example .env; fi
    @echo ".env is ready."

# Setup Anchor keys + regenerate client + compile program.
setup-anchor:
    pnpm run setup
    pnpm run anchor-build

# Configure localnet dev faucet authority + local USDC/USDT mints in .env.local.
setup-localnet-faucet:
    pnpm run setup:localnet-faucet

# Start local infrastructure and sync schema.
setup-db:
    docker compose up -d
    pnpm db:push
    @echo "Database is ready."

# One command for first-time local setup.
setup-local: doctor install setup-env setup-anchor
    @echo "Local setup complete."
    @echo "Optional next steps:"
    @echo "  just setup-db"
    @echo "  just dev-all"

# Run the Next.js development server.
dev:
    pnpm dev

# Run Next.js + local db.
dev-all: db-run dev

# Start local validator via Anchor.
anchor-localnet:
    pnpm run anchor-localnet

# Run web unit/integration tests.
test:
    pnpm test

# Run Anchor localnet tests.
anchor-test:
    pnpm run anchor-test

# Run all automated tests.
test-all: test anchor-test

# Lint the workspace.
lint:
    pnpm lint

# Format the entire workspace (web + Anchor).
format: format-web format-anchor

# Check formatting without writing changes.
format-check: format-check-web format-check-anchor

# Format only the web workspace.
format-web:
    pnpm format

# Check web formatting without modifying files.
format-check-web:
    pnpm format:check

# Format the Anchor project with cargo fmt.
format-anchor:
    cd {{anchor_dir}} && cargo fmt

# Check Anchor formatting without modifying files.
format-check-anchor:
    cd {{anchor_dir}} && cargo fmt -- --check

# Build the Anchor program.
anchor-build:
    pnpm run anchor-build

# Deploy the Anchor program to the given cluster (localnet/devnet/testnet/mainnet).
anchor-deploy cluster="devnet":
    cd {{anchor_dir}} && anchor deploy --provider.cluster {{cluster}}

# Convenience wrappers for common clusters.
anchor-deploy-localnet:
    just anchor-deploy cluster=localnet

anchor-deploy-devnet:
    just anchor-deploy cluster=devnet

anchor-deploy-testnet:
    just anchor-deploy cluster=testnet

anchor-deploy-mainnet:
    just anchor-deploy cluster=mainnet

# Start local db container(s).
db-run:
    docker compose up -d

# Stop local db container(s).
db-stop:
    docker compose down
