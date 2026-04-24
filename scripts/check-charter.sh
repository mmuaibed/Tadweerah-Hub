#!/usr/bin/env bash
# =============================================================================
# Charter Guard — POST /listings eligibility gate detector
# =============================================================================
# Run: bash scripts/check-charter.sh
# Exit 0 = clean. Exit 1 = violation found.
#
# RULE: POST /listings must contain NO eligibility logic.
#       All eligibility is enforced exclusively in POST /offers.
#
# Patterns that are NEVER allowed inside the POST /listings handler:
#   - license_status comparisons (e.g. === "rejected")
#   - capability / LicenseRequired / LicenseInvalid error throws
#   - any HttpError with code containing "License" or "Capability"
# =============================================================================

set -euo pipefail

LISTINGS_FILE="artifacts/api-server/src/routes/listings.ts"
VIOLATIONS=0

check() {
  local label="$1"
  local pattern="$2"

  # Only scan lines between the POST /listings handler start and the next
  # top-level route definition. We use awk to extract just that block.
  local block
  block=$(awk '/router\.post\(\s*"\/listings"/{flag=1} flag{print} /^router\.(get|post|put|delete|patch)\(/{if(!/router\.post\(\s*"\/listings"/)flag=0}' "$LISTINGS_FILE")

  if echo "$block" | grep -qE "$pattern"; then
    echo "❌ VIOLATION [$label]: Pattern '$pattern' found inside POST /listings handler"
    echo "   Matching lines:"
    echo "$block" | grep -nE "$pattern" | head -5 | sed 's/^/   /'
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

echo "=== Charter Guard: POST /listings eligibility check ==="
echo "    File: $LISTINGS_FILE"
echo ""

check "license_status comparison"      "license_status\s*(===|!==|==|!=)"
check "LicenseInvalid error"           "LicenseInvalid"
check "LicenseRequired error"          "LicenseRequired"
check "MissingCapability error"        "MissingCapability"
check "capability eligibility gate"    "requires_license"
check "HttpError.*[Ll]icense"         "HttpError.*[Ll]icense"
check "license_status throw/block"     "throw.*[Ll]icense"

echo ""
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✅ All charter checks passed — POST /listings has no eligibility gates."
  exit 0
else
  echo "🚨 $VIOLATIONS charter violation(s) detected in POST /listings."
  echo "   Fix: remove all eligibility logic from listing creation."
  echo "   Eligibility belongs ONLY in POST /offers."
  exit 1
fi
