#!/usr/bin/env bash
# Verifies the isolation guard itself: it must PASS on a pristine tree and
# FAIL when the recorded baseline no longer matches.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$HERE/verify-desktop-untouched.sh" >/dev/null 2>&1
if [ $? -ne 0 ]; then echo "FAIL: guard rejected a pristine tree"; exit 1; fi

# Tamper only with our own baseline record, never with mailvelope/.
BASELINE="$HERE/../.desktop-baseline"
cp "$BASELINE" "$BASELINE.bak"
echo "0000000000000000000000000000000000000000" > "$BASELINE"
"$HERE/verify-desktop-untouched.sh" >/dev/null 2>&1
rc=$?
mv "$BASELINE.bak" "$BASELINE"
if [ $rc -eq 0 ]; then echo "FAIL: guard accepted a wrong baseline"; exit 1; fi

echo "PASS: guard accepts pristine, rejects drift"
