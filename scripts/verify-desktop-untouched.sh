#!/usr/bin/env bash
# Asserts the desktop Chrome extension has not been modified.
#
# The baseline is deliberately updated ONLY for changes the user has explicitly
# authorised. It moved once, on 2026-09-08, from a2bf3bca (v0.1.3) to the
# oauth-fix-stable-id branch, for the requested redirect_uri_mismatch fix.
# Any other drift is a bug and this script must fail.
# REPO_ROOT is the parent of mobile/ — not this script's directory.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
DESKTOP="$REPO_ROOT/mailvelope"
RELEASE="$DESKTOP/releases/secure-mail-v0.1.6-gmail-icon"
fail() { echo "DESKTOP ISOLATION VIOLATED: $1" >&2; exit 1; }

[ -d "$DESKTOP" ] || fail "missing $DESKTOP"

# 1. Working tree clean.
if [ -n "$(git -C "$DESKTOP" status --porcelain)" ]; then
  git -C "$DESKTOP" status --short >&2
  fail "mailvelope/ working tree is dirty"
fi

# 2. HEAD matches the pinned baseline.
expected="$(tr -d '[:space:]' < "$HERE/../.desktop-baseline")"
actual="$(git -C "$DESKTOP" rev-parse HEAD)"
[ "$expected" = "$actual" ] || fail "HEAD is $actual, expected $expected"

# 3. build/chrome/ still matches the released extension checksums.
#    SHA256SUMS.txt paths are relative to the release folder and 161 of them
#    are under extension/, which is byte-identical to build/chrome/.
missing=0; bad=0; checked=0
while read -r sum path; do
  case "$path" in extension/*) ;; *) continue ;; esac
  target="$DESKTOP/build/chrome/${path#extension/}"
  checked=$((checked+1))
  if [ ! -f "$target" ]; then missing=$((missing+1)); continue; fi
  actual_sum="$(sha256sum "$target" | cut -d' ' -f1)"
  [ "$actual_sum" = "$sum" ] || { echo "  changed: ${path#extension/}" >&2; bad=$((bad+1)); }
done < "$RELEASE/SHA256SUMS.txt"

[ "$missing" -eq 0 ] || fail "$missing file(s) missing from build/chrome/"
[ "$bad" -eq 0 ] || fail "$bad file(s) in build/chrome/ have changed"

echo "OK: mailvelope/ pristine at ${actual:0:8} ($checked extension files verified)"
