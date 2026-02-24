#!/bin/bash
set -eo pipefail

echo "Cleaning up development artifacts..."
rm -rf node_modules
rm -rf .next .swc
rm -rf target anchor/target
rm -rf anchor/.anchor anchor/test-ledger anchor/test_ledger
rm -rf .pnpm-store .sbf-sdk
rm -f tsconfig.tsbuildinfo

echo "Cleanup complete! You can now perform a fresh install."
