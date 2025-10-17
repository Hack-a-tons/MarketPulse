# Services Usage Status

## Currently Active Services

### ✅ Redpanda (Kafka-compatible streaming)
**Status:** FULLY IMPLEMENTED & RUNNING
- **What it does:** Message streaming platform for events
- **How we use it:**
  - Topic: `market.news` - streams 893K+ financial news articles
  - Topic: `market.prices` - streams stock price data  
  - Producers publish historical data
  - Consumers (reasoning & improvement services) subscribe and process
- **Configuration:** 
  - Port: 19000 (Kafka API)
  - Port: 20000 (Admin API)
  - Running in Docker container
- **Evidence:** Check with `ssh biaz.hurated.com "cd MarketPulse && docker compose logs redpanda"`

### ✅ Node.js/Express API
**Status:** FULLY IMPLEMENTED & RUNNING
- **What it does:** Main application server
- **How we use it:**
  - HTTP REST API endpoints
  - Static dashboard serving
  - Orchestrates all phases (1-4)
  - Health checks, metrics, control endpoints
- **Port:** 16000 (https://finance.biaz.hurated.com)
- **Evidence:** Check with `curl https://finance.biaz.hurated.com/health`

---

## Services We Plan to Use (Not Yet Integrated)

### ⏳ TrueFoundry (LLM/AI Platform)
**Status:** INTEGRATED BUT NOT ACTIVE
- **What it does:** LLM inference platform for AI predictions
- **How we plan to use it:**
  - Analyze sentiment from news
  - Generate market predictions
  - Provide reasoning for trades
- **Current state:** 
  - ✅ Code implemented (`src/utils/trueFoundryClient.ts`)
  - ❌ API key not configured
  - ⚠️ Currently using mock predictions
- **To activate:** Set `TRUEFOUNDRY_API_KEY` and `TRUEFOUNDRY_WORKSPACE` in `.env`

### ⏳ Senso Context OS (Self-Improvement)
**Status:** INTEGRATED BUT NOT ACTIVE
- **What it does:** Stores predictions and tracks accuracy for continuous learning
- **How we plan to use it:**
  - Store all predictions
  - Track actual outcomes
  - Calculate accuracy metrics
  - Recommend confidence thresholds
- **Current state:**
  - ✅ Code implemented (`src/utils/sensoClient.ts`)
  - ❌ API key not configured
  - ⚠️ Currently using local memory cache
- **To activate:** Set `SENSO_API_KEY` and `SENSO_ORG_ID` in `.env`

### ⏳ Slack (Notifications)
**Status:** INTEGRATED BUT NOT ACTIVE
- **What it does:** Sends high-confidence prediction alerts
- **How we plan to use it:**
  - Notify on predictions >70% confidence
  - Send performance summaries
  - Alert on system issues
- **Current state:**
  - ✅ Code implemented (`src/utils/slackNotifier.ts`)
  - ❌ Webhook URL not configured
  - ⚠️ Notifications disabled
- **To activate:** Set `SLACK_WEBHOOK_URL` in `.env`

### ⏳ Apify (Live News Scraping)
**Status:** PLANNED FOR FUTURE
- **What it does:** Real-time web scraping for live financial news
- **How we plan to use it:**
  - Replace historical Bloomberg data with live news
  - Continuous market monitoring
  - Real-time predictions
- **Current state:**
  - ✅ Configuration ready (`APIFY_API_TOKEN`)
  - ❌ Not implemented yet
  - ⚠️ Placeholder in `src/producers/streamLive.ts`
- **To implement:** Phase 5 - Live Data Integration

---

## What's Actually Running Right Now

### Active Components:
1. **Redpanda** - Streaming 893K news articles + 50K stock prices
2. **Historical Replay Producer** - Reading CSVs and publishing to Redpanda
3. **Reasoning Service** - Consuming events, generating predictions (mock LLM)
4. **Improvement Service** - Tracking predictions (local storage)
5. **Express API** - Serving dashboard and REST endpoints
6. **Web Dashboard** - Displaying predictions at https://finance.biaz.hurated.com

### Data Flow (Current):
```
CSV Files (Kaggle Data)
    ↓
Historical Replay Producer
    ↓
Redpanda Topics (market.news, market.prices)
    ↓
Reasoning Service → Mock Predictions
    ↓
Local Memory Storage
    ↓
REST API → Web Dashboard
```

### Data Flow (With All Services):
```
Live News (Apify) + CSV Files
    ↓
Historical Replay Producer
    ↓
Redpanda Topics
    ↓
Reasoning Service → TrueFoundry LLM
    ↓
Senso Context OS (tracking) + Slack (alerts)
    ↓
REST API → Web Dashboard
```

---

## How to Check What's Running

### Quick Status:
```bash
./scripts/status.sh
```

### Individual Checks:
```bash
# Check all services
curl https://finance.biaz.hurated.com/stream/status | jq

# Check Docker containers
ssh biaz.hurated.com "cd MarketPulse && docker compose ps"

# Check Redpanda topics
ssh biaz.hurated.com "cd MarketPulse && docker exec marketpulse-redpanda rpk topic list"

# Check live logs
ssh biaz.hurated.com "cd MarketPulse && docker compose logs -f pulse-service"
```

---

## Summary

**Currently Using:**
- ✅ Redpanda (streaming)
- ✅ Node.js/Express (API)
- ✅ Docker (containerization)
- ✅ nginx (SSL proxy)

**Ready to Use (Need API Keys):**
- ⏳ TrueFoundry (LLM)
- ⏳ Senso (tracking)
- ⏳ Slack (notifications)

**Not Yet Implemented:**
- ❌ Apify (live news)

The system is **fully functional** with Redpanda and mock predictions. The LLM/Senso/Slack integrations are **code-complete** and will activate once API keys are added to `.env`.
