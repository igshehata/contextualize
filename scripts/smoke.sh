#!/usr/bin/env bash
#
# Live load-test for the contextualize plugin.
#
# Spins up a throwaway opencode project + isolated XDG dirs (so it never touches
# your real ~/.local/share/opencode data or DB), points opencode at the locally
# built plugin, dumps the resolved config, and asserts the kit was injected.
# Everything is created under a mktemp dir and removed on exit.
#
# Usage: ./scripts/smoke.sh   (or: mise run verify)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -f "$ROOT/dist/index.mjs" ]]; then
  echo "✗ dist/index.mjs not found — run 'mise run build' first" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

mkdir -p "$TMP/data" "$TMP/config" "$TMP/state" "$TMP/cache"
cat > "$TMP/opencode.json" <<JSON
{ "\$schema": "https://opencode.ai/config.json", "plugin": ["$ROOT"] }
JSON

echo "→ loading plugin from: $ROOT"
echo "→ isolated XDG home:   $TMP"

# opencode has no --timeout; perl's alarm bounds the run on macOS (no coreutils).
OUT="$(
  cd "$TMP" && perl -e 'alarm shift; exec @ARGV' 90 env \
    XDG_DATA_HOME="$TMP/data" \
    XDG_CONFIG_HOME="$TMP/config" \
    XDG_STATE_HOME="$TMP/state" \
    XDG_CACHE_HOME="$TMP/cache" \
    opencode debug config 2>&1
)" || { echo "✗ opencode debug config failed:"; echo "$OUT" | tail -20; exit 1; }

fail=0
for needle in "context7" "sequential-thinking" "rm -rf"; do
  if grep -q "$needle" <<<"$OUT"; then
    echo "✓ injected: $needle"
  else
    echo "✗ missing:  $needle"
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "--- resolved config (tail) ---" >&2
  echo "$OUT" | tail -40 >&2
  exit 1
fi

echo "PASS — contextualize loads in opencode and injects its kit"
