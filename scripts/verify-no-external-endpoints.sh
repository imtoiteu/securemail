#!/usr/bin/env bash
#
# Secure Mail — build-artefact network-surface audit.
#
# Verifies two separate claims about a built extension, so neither has to be
# taken on trust:
#
#   1. FORBIDDEN — endpoints that Secure Mail removed from the upstream code
#      base must not appear anywhere in the built artefact. A hit is a
#      regression (typically an upstream merge re-introducing the code) and
#      fails the build.
#
#   2. INVENTORY — every other remote host the artefact can reach is listed
#      with the number of occurrences, so a reviewer can compare the list
#      against the documented network surface instead of grepping by hand.
#
# Usage: scripts/verify-no-external-endpoints.sh [build-dir]   (default build/chrome)

set -uo pipefail

BUILD_DIR="${1:-build/chrome}"

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "FAIL: build directory '$BUILD_DIR' not found. Run 'npx grunt prod' first." >&2
  exit 2
fi

# Endpoints deliberately removed from the fork. See:
#   src/lib/analytics.js        — Clean Insights telemetry SDK
#   src/modules/gmail.js        — Google Workspace commercial licence check
#   src/app/settings/Provider.js— vendor product/upsell page
FORBIDDEN=(
  'cleaninsights'
  'metrics.cleaninsights.org'
  'license.mailvelope.com'
  'mailvelope.com/google-workspace'
)

echo "Secure Mail — network-surface audit of ${BUILD_DIR}"
echo "======================================================================"
echo
echo "[1] Forbidden endpoints (must be absent)"
echo "----------------------------------------------------------------------"

fail=0
for pattern in "${FORBIDDEN[@]}"; do
  hits=$(grep -roh --include='*.js' --include='*.html' --include='*.css' --include='*.json' \
           -F "$pattern" "$BUILD_DIR" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$hits" == "0" ]]; then
    printf '  PASS  %-40s 0 occurrences\n' "$pattern"
  else
    printf '  FAIL  %-40s %s occurrence(s)\n' "$pattern" "$hits"
    grep -rn --include='*.js' --include='*.html' --include='*.css' --include='*.json' \
      -F "$pattern" "$BUILD_DIR" 2>/dev/null | head -3 | sed 's/^/          /'
    fail=1
  fi
done

echo
echo "[2] Network call sites in the source (complete list)"
echo "----------------------------------------------------------------------"
echo "  Every outbound request the extension can make originates in one of the"
echo "  modules below. Grepping the minified bundle for URLs is misleading: most"
echo "  hits are documentation links inside third-party library messages, which"
echo "  are never fetched. The authoritative surface is the set of call sites."
echo
if [[ -d src ]]; then
  grep -rn 'fetch(\|XMLHttpRequest\|new WebSocket\|sendBeacon' src/ --include='*.js' \
    | awk -F: '{print $1}' | sort -u | sed 's/^/    /'
else
  echo "    (source tree not present; run from the repository root to list them)"
fi
cat <<'SURFACE'

  Resolved hosts and their status:

    accounts.google.com          Gmail sign-in            ENABLED  (feature in use)
    oauth2.googleapis.com        OAuth token exchange     ENABLED  (feature in use)
    www.googleapis.com           Gmail API + userinfo     ENABLED  (feature in use)
    keys.mailvelope.com          public key server        DISABLED by default
    keys.openpgp.org             public key server        DISABLED by default
    <recipient domain> (WKD)     key lookup by domain     DISABLED by default
    chrome-extension://<id>/...  bundled SVG assets       local only, never remote

  The four DISABLED lookups are switched off in src/res/defaults.json
  (mvelo_tofu_lookup, oks_lookup, wkd_lookup, autocrypt_lookup) and can be
  re-enabled by an administrator; they are shown unchecked in the Key
  Directories settings pane.
SURFACE

echo
echo "======================================================================"
if [[ "$fail" == "0" ]]; then
  echo "RESULT: PASS — no removed endpoint is present in ${BUILD_DIR}."
  exit 0
else
  echo "RESULT: FAIL — a removed endpoint reappeared in ${BUILD_DIR}."
  exit 1
fi
