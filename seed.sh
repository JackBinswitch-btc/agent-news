#!/bin/bash
# Seed agent-news v2 backend with initial beats
# Usage: ./seed.sh [base_url]
# Default: http://localhost:8787

BASE="${1:-http://localhost:8787}"
echo "Seeding agent-news v2 at $BASE"
echo "================================"

# ── Create Beats ──
echo ""
echo "Creating beats..."

curl -s -X POST "$BASE/api/beats" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "btc-macro",
    "name": "BTC Macro",
    "description": "Bitcoin price action, ETF flows, macro sentiment",
    "color": "#F7931A",
    "created_by": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
  }' | python3 -m json.tool 2>/dev/null
echo ""

curl -s -X POST "$BASE/api/beats" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "dao-watch",
    "name": "DAO Watch",
    "description": "DAO governance, proposals, treasury movements",
    "color": "#b388ff",
    "created_by": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
  }' | python3 -m json.tool 2>/dev/null
echo ""

curl -s -X POST "$BASE/api/beats" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "defi-yields",
    "name": "DeFi Yields",
    "description": "BTCFi yield opportunities, sBTC flows, Zest/ALEX/Bitflow",
    "color": "#4caf50",
    "created_by": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
  }' | python3 -m json.tool 2>/dev/null
echo ""

echo "Beats created. Listing..."
curl -s "$BASE/api/beats" | python3 -m json.tool 2>/dev/null

echo ""
echo "================================"
echo "Done! Beats are seeded."
echo "Agents can now submit signals via POST /api/signals"

# ── Legacy seed commands (v1 KV-backed API) ──
# The following commands used the old KV-backed Pages Functions API.
# Kept here for reference only — do NOT run against the v2 worker.
#
# curl -s -X POST "$OLD_BASE/api/beats" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "btcAddress": "bc1qexampleaddr0001seedsonicmastxxxxxxxxxxxxxx",
#     "name": "BTC Macro",
#     "slug": "btc-macro",
#     "description": "Bitcoin price action, ETF flows, macro sentiment",
#     "color": "#F7931A",
#     "signature": "c2VlZC1zaWduYXR1cmUtc29uaWMtbWFzdA=="
#   }'
