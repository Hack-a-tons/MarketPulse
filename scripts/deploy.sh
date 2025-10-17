#!/usr/bin/env bash

###############################################################################
# deploy.sh - Automated deployment script for Market Pulse Analyst
# 
# Deploys local changes to production server at biaz.hurated.com
# 
# Usage:
#   ./scripts/deploy.sh                    # Deploy without git commit
#   ./scripts/deploy.sh -m "commit msg"    # Stage, commit, and deploy
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REMOTE_HOST="biaz.hurated.com"
REMOTE_DIR="MarketPulse"
COMMIT_MESSAGE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--message)
            COMMIT_MESSAGE="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [-m|--message \"commit message\"]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Market Pulse Analyst - Production Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Copy .env to remote
echo -e "${CYAN}[1/6]${NC} Copying .env to ${REMOTE_HOST}..."
if scp .env ${REMOTE_HOST}:${REMOTE_DIR}/ 2>/dev/null; then
    echo -e "      ${GREEN}✓${NC} Environment file copied"
else
    echo -e "      ${YELLOW}⚠${NC}  Warning: Could not copy .env (may not exist or connection issue)"
fi

# Step 2: Git commit (if message provided)
if [[ -n "$COMMIT_MESSAGE" ]]; then
    echo -e "${CYAN}[2/6]${NC} Staging and committing changes..."
    
    # Check if there are changes to commit
    if git diff --quiet && git diff --cached --quiet; then
        echo -e "      ${YELLOW}⚠${NC}  No changes to commit"
    else
        git add .
        git commit -m "$COMMIT_MESSAGE"
        echo -e "      ${GREEN}✓${NC} Changes committed: ${COMMIT_MESSAGE}"
    fi
else
    echo -e "${CYAN}[2/6]${NC} Skipping git commit (no -m flag provided)"
fi

# Step 3: Push to GitHub
echo -e "${CYAN}[3/6]${NC} Pushing to GitHub..."
if git push origin main 2>&1 | grep -q "Everything up-to-date"; then
    echo -e "      ${GREEN}✓${NC} Already up to date"
elif git push origin main; then
    echo -e "      ${GREEN}✓${NC} Pushed to origin/main"
else
    echo -e "      ${RED}✗${NC} Failed to push to GitHub"
    exit 1
fi

# Step 4: Pull changes on remote
echo -e "${CYAN}[4/6]${NC} Pulling changes on ${REMOTE_HOST}..."
if ssh ${REMOTE_HOST} "cd ${REMOTE_DIR} && git pull" 2>&1 | grep -q "Already up to date"; then
    echo -e "      ${GREEN}✓${NC} Remote already up to date"
else
    echo -e "      ${GREEN}✓${NC} Remote repository updated"
fi

# Step 5: Build Docker containers
echo -e "${CYAN}[5/6]${NC} Building Docker containers on ${REMOTE_HOST}..."
ssh ${REMOTE_HOST} "cd ${REMOTE_DIR} && docker compose build" 2>&1 | while IFS= read -r line; do
    if [[ "$line" =~ "Successfully built" ]] || [[ "$line" =~ "Successfully tagged" ]]; then
        echo -e "      ${GREEN}✓${NC} $line"
    elif [[ "$line" =~ "ERROR" ]] || [[ "$line" =~ "failed" ]]; then
        echo -e "      ${RED}✗${NC} $line"
    else
        echo "      $line"
    fi
done

if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    echo -e "      ${RED}✗${NC} Docker build failed"
    exit 1
fi

# Step 6: Restart services
echo -e "${CYAN}[6/6]${NC} Restarting services on ${REMOTE_HOST}..."
if ssh ${REMOTE_HOST} "cd ${REMOTE_DIR} && docker compose up -d"; then
    echo -e "      ${GREEN}✓${NC} Services restarted"
else
    echo -e "      ${RED}✗${NC} Failed to restart services"
    exit 1
fi

# Final status check
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Check service status:"
echo -e "  ${CYAN}ssh ${REMOTE_HOST} 'cd ${REMOTE_DIR} && docker compose ps'${NC}"
echo ""
echo -e "View logs:"
echo -e "  ${CYAN}ssh ${REMOTE_HOST} 'cd ${REMOTE_DIR} && docker compose logs -f'${NC}"
echo ""
echo -e "Service URLs:"
echo -e "  • API: ${GREEN}http://${REMOTE_HOST}:16000${NC}"
echo -e "  • Redpanda: ${GREEN}${REMOTE_HOST}:19000${NC}"
echo -e "  • Redpanda Admin: ${GREEN}http://${REMOTE_HOST}:20000${NC}"
echo ""
