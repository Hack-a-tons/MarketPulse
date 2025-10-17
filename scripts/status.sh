#!/usr/bin/env bash

###############################################################################
# status.sh
# 
# Shows real-time status of Market Pulse Analyst services
# Run from dev machine to check production status
###############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Remote configuration
REMOTE_HOST="${REMOTE_HOST:-biaz.hurated.com}"
API_URL="https://finance.biaz.hurated.com"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Market Pulse Analyst - Status Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Check API Health
echo -e "${CYAN}[1/6]${NC} API Health Check..."
if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "      ${GREEN}✓${NC} API is healthy"
else
    echo -e "      ${RED}✗${NC} API is not responding"
fi

# 2. Check Service Status
echo -e "${CYAN}[2/6]${NC} Service Status..."
STATUS=$(curl -s "${API_URL}/stream/status" || echo '{}')

HISTORICAL=$(echo "$STATUS" | jq -r '.historical.running // false')
REASONING=$(echo "$STATUS" | jq -r '.reasoning.running // false')
IMPROVEMENT=$(echo "$STATUS" | jq -r '.improvement.running // false')

if [ "$HISTORICAL" = "true" ]; then
    echo -e "      ${GREEN}✓${NC} Historical replay: ACTIVE (streaming data)"
    # Check for progress in logs
    PROGRESS=$(ssh "$REMOTE_HOST" "cd MarketPulse && docker compose logs --tail=100 pulse-service 2>/dev/null | grep -o 'Published [0-9]* [a-z]* events' | tail -1" || echo "")
    if [ -n "$PROGRESS" ]; then
        echo -e "         Progress: $PROGRESS"
    fi
else
    echo -e "      ${YELLOW}○${NC} Historical replay: INACTIVE"
    # Check if it completed
    NEWS_COMPLETE=$(ssh "$REMOTE_HOST" "cd MarketPulse && docker compose logs pulse-service 2>/dev/null | grep 'News replay complete' | tail -1" 2>/dev/null || echo "")
    if [ -n "$NEWS_COMPLETE" ]; then
        NEWS_COUNT=$(echo "$NEWS_COMPLETE" | grep -o '[0-9]\+ events' || echo "")
        PRICE_COMPLETE=$(ssh "$REMOTE_HOST" "cd MarketPulse && docker compose logs pulse-service 2>/dev/null | grep 'Prices:' | tail -1" 2>/dev/null || echo "")
        PRICE_COUNT=$(echo "$PRICE_COMPLETE" | grep -o '[0-9]\+ events' || echo "")
        echo -e "         ${GREEN}Completed${NC}: News=${NEWS_COUNT}, Prices=${PRICE_COUNT}"
    fi
fi

if [ "$REASONING" = "true" ]; then
    echo -e "      ${GREEN}✓${NC} AI Reasoning: ACTIVE"
else
    echo -e "      ${YELLOW}○${NC} AI Reasoning: INACTIVE"
fi

if [ "$IMPROVEMENT" = "true" ]; then
    echo -e "      ${GREEN}✓${NC} Self-Improvement: ACTIVE"
else
    echo -e "      ${YELLOW}○${NC} Self-Improvement: INACTIVE"
fi

# 3. Check Data Buffers
echo -e "${CYAN}[3/6]${NC} Data Flow Status..."
NEWS_BUFFER=$(echo "$STATUS" | jq -r '.reasoning.buffers.news // 0')
PRICE_BUFFER=$(echo "$STATUS" | jq -r '.reasoning.buffers.prices // 0')
IMPROVEMENT_BUFFER=$(echo "$STATUS" | jq -r '.improvement.bufferSize // 0')

echo -e "      News in buffer: ${NEWS_BUFFER}"
echo -e "      Prices in buffer: ${PRICE_BUFFER}"
echo -e "      Improvement buffer: ${IMPROVEMENT_BUFFER}"

if [ "$NEWS_BUFFER" -gt 0 ] || [ "$PRICE_BUFFER" -gt 0 ]; then
    echo -e "      ${GREEN}✓${NC} Data is flowing"
else
    echo -e "      ${YELLOW}⚠${NC}  No data in buffers (may be consuming)"
fi

# 4. Check Performance Metrics
echo -e "${CYAN}[4/6]${NC} Performance Metrics..."
METRICS=$(curl -s "${API_URL}/metrics" || echo '{}')

TOTAL_PREDICTIONS=$(echo "$METRICS" | jq -r '.totalPredictions // 0')
ACCURACY=$(echo "$METRICS" | jq -r '.accuracy // 0')
ACCURACY_PCT=$(echo "$ACCURACY * 100" | bc 2>/dev/null || echo "0")

echo -e "      Total predictions: ${TOTAL_PREDICTIONS}"
if [ "$TOTAL_PREDICTIONS" -gt 0 ]; then
    echo -e "      Accuracy: ${ACCURACY_PCT:0:5}%"
    echo -e "      ${GREEN}✓${NC} AI is generating predictions"
else
    echo -e "      ${YELLOW}⚠${NC}  No predictions yet (waiting for first analysis)"
fi

# 5. Check Recent Predictions
echo -e "${CYAN}[5/6]${NC} Recent Predictions..."
PREDICTIONS=$(curl -s "${API_URL}/insights/recent" || echo '{}')
PRED_COUNT=$(echo "$PREDICTIONS" | jq -r '.count // 0')

if [ "$PRED_COUNT" -gt 0 ]; then
    echo -e "      ${GREEN}✓${NC} Found ${PRED_COUNT} recent predictions"
    echo ""
    echo -e "      ${BLUE}Latest Predictions:${NC}"
    echo "$PREDICTIONS" | jq -r '.predictions[0:3][] | "      - \(.prediction | ascii_upcase) (\(.confidence * 100 | floor)%) @ \(.timestamp[0:19])"' 2>/dev/null || echo "      (Unable to parse predictions)"
else
    echo -e "      ${YELLOW}⚠${NC}  No predictions yet"
fi

# 6. Check Docker Container Status
echo -e "${CYAN}[6/6]${NC} Docker Container Status..."
ssh "$REMOTE_HOST" "cd MarketPulse && docker compose ps --format json" 2>/dev/null | jq -r '. | "      \(.Service): \(.State) (\(.Health // "no healthcheck"))"' 2>/dev/null || echo "      Unable to check containers"

# 7. Show Recent Logs (last minute)
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Recent Activity (last 30 seconds)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

ssh "$REMOTE_HOST" "cd MarketPulse && docker compose logs --since 30s pulse-service 2>&1 | grep -E '(Received|Published|Prediction|✨|📰|💰)' | tail -10" || echo "No recent activity"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Status check complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Dashboard: ${CYAN}${API_URL}${NC}"
echo -e "Live logs: ${CYAN}ssh ${REMOTE_HOST} 'cd MarketPulse && docker compose logs -f pulse-service'${NC}"
echo ""
