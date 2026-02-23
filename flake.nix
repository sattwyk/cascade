{
  description = "Cascade Developer Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        # Overlay to fix solana-cli build failure caused by unused import
        # warning in upstream Solana source (ledger/src/blockstore/error.rs).
        # The Solana crate compiles with -D warnings, so the unused `log::*`
        # import becomes a fatal error. This mirrors the upstream nixpkgs fix
        # at commit 3cc5dae74c3359e3ab95b856673a0d8fd383ff72.
        # TODO: Remove this overlay once nixos-unstable includes that fix.
        solanaFixOverlay = final: prev: {
          solana-cli = prev.solana-cli.overrideAttrs (oldAttrs: {
            env = (oldAttrs.env or {}) // {
              RUSTFLAGS = "-Amismatched_lifetime_syntaxes -Adead_code -Aunused_parens -Aunused_imports";
            };
          });
        };

        overlays = [
          (import rust-overlay)
          solanaFixOverlay
        ];
        pkgs = import nixpkgs {
          inherit system overlays;
          config.allowUnfree = true;
        };
        
        # Rust toolchain for standard development and Anchor
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" "clippy" "rustfmt" ];
          targets = [ "wasm32-unknown-unknown" ];
        };
        
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Rust toolchain
            rustToolchain
            
            # Node.js and package manager
            nodejs_22
            corepack_22 # Includes pnpm
            
            # Core dependencies
            git
            just
            python3
            pkg-config
            openssl
            docker
            docker-compose
            
            # Build tools
            stdenv.cc.cc.lib
            gcc
            
            # Solana & Anchor specific
            # Note: Anchor needs a specific Solana CLI version that it usually manages itself,
            # but we provide the system one as a fallback
            solana-cli
            anchor
          ];

          shellHook = ''
            export PATH=$PWD/node_modules/.bin:$PATH
            
            # Enable corepack for pnpm management to ensure we use version from package.json
            corepack enable
            corepack prepare pnpm@10.18.0 --activate
            
            # Solana local config setup
            export SOLANA_HOME=~/.config/solana
            export PATH=$SOLANA_HOME/bin:$PATH
            
            # Ensure local solana config directory exists
            if [ ! -d "$SOLANA_HOME" ]; then
              mkdir -p "$SOLANA_HOME"
            fi
            
            # Generate local keypair if it doesn't exist (needed for localnet deployments)
            if [ ! -f "$SOLANA_HOME/id.json" ]; then
              echo "Generating local Solana keypair..."
              solana-keygen new --no-bip39-passphrase --outfile "$SOLANA_HOME/id.json"
            fi

            # Print welcome message
            echo "🚀 Welcome to the Cascade development environment!"
            echo "📦 Tool versions:"
            echo "- Node.js: $(node --version)"
            echo "- pnpm: $(pnpm --version)"
            echo "- Rust: $(rustc --version)"
            echo "- Solana: $(solana --version 2>/dev/null || echo 'solana-cli missing')"
            echo "- Anchor: $(anchor --version 2>/dev/null || echo 'anchor missing')"
            echo "- Just: $(just --version | head -n1)"
            echo ""
            echo "🛠️  Quick Start:"
            echo "  1. Run 'just doctor' to verify all tools are available"
            echo "  2. Run 'just setup-local' to install dependencies and build"
            echo "  3. Run 'just dev-all' to start local db and Next.js"
            echo ""
            echo "📝 Run 'just' to see all available commands."
          '';

          # Required for some native modules and Solana/Anchor compilation
          LIBCLANG_PATH = "${pkgs.libclang.lib}/lib";
          LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
            pkgs.openssl
            pkgs.stdenv.cc.cc.lib
            pkgs.udev
            pkgs.vulkan-loader
          ];
          
          # Environment variables for Solana/Anchor builds
          RUST_BACKTRACE = "1";
        };
      });
}
