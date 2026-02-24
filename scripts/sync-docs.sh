#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

sync_docs() {
  local repo_url="$1"
  local repo_ref="$2"
  local source_path="$3"
  local target_dir="$4"
  local clone_name="$5"
  local clone_path="$TMP_DIR/$clone_name"

  git clone --depth 1 --filter=blob:none --sparse --branch "$repo_ref" "$repo_url" "$clone_path" >/dev/null
  git -C "$clone_path" sparse-checkout set "$source_path"

  rm -rf "$ROOT_DIR/$target_dir"
  mkdir -p "$ROOT_DIR/$target_dir"
  cp -a "$clone_path/$source_path/." "$ROOT_DIR/$target_dir/"

  printf 'Synced %s (%s) -> %s\n' "$repo_url" "$repo_ref" "$target_dir"
}

sync_docs "https://github.com/solana-foundation/anchor.git" "master" "docs/content/docs" ".anchor-docs" "anchor"
sync_docs "https://github.com/gillsdk/gill.git" "master" "docs/content/docs" ".gill-docs" "gill"
sync_docs "https://github.com/wallet-ui/wallet-ui.git" "main" "docs/content/docs" ".wallet-ui-docs" "wallet-ui"

printf 'All external docs synced.\n'
