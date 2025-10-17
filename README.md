# Market Pulse Analyst

**Adaptive Financial News Agent (Self-Improving AI Trader Assistant)**

Market Pulse Analyst is an autonomous system that continuously ingests financial news and market data, correlates it in real time, predicts short‑term trends — and **improves its reasoning over time based on actual outcomes**.

---
## 🌍 Problem & Vision
Humans cannot monitor global financial signals 24/7 — especially across hundreds of tickers, news sources, and macroeconomic indicators.

**Market Pulse Analyst acts as a continuously learning AI analyst** that:
- Never sleeps
- Detects market‑moving news instantly
- Correlates price + sentiment impact
- Learns which sources and strategies work best over time

> **Long‑term vision:** A self‑evolving AI trading co‑pilot that gets *smarter every day*.

---
## 📊 Dataset Setup

This project uses historical data from Kaggle for backtesting and model training:

### Required Datasets

1. **S&P 500 Stock Prices** (Daily Updated)
   - **Source:** [S&P500 All assets- Daily Updated dataset](https://www.kaggle.com/datasets/yash16jr/s-and-p500-daily-update-dataset)
   - **Location:** `data/kaggle/stocks/SnP_daily_update.csv`
   - **Coverage:** Daily price data for all S&P 500 companies

2. **Bloomberg News Articles with Sentiment Scores** (2006-2013)
   - **Source:** [Bloomberg News Articles Sentiment scores (2006-13)](https://www.kaggle.com/datasets/perryperryfries/bloomberg-news-articles-sentiment-scores-2006-13)
   - **Location:** `data/kaggle/news/`
     - `bloomberg_news_articles.csv` - Full-text articles
     - `news_sentiment_scores.csv` - Pre-computed sentiment (Gemini + DeBERTAv3)
   - **Coverage:** 7 years of Bloomberg financial news with sentiment analysis

### Installation Instructions

After cloning this repository:

```bash
# 1. Create the data directory structure
mkdir -p data/kaggle/stocks data/kaggle/news

# 2. Download datasets from Kaggle (requires Kaggle account)
# Visit the URLs above and download the datasets

# 3. Place the files in the correct locations:
# - SnP_daily_update.csv → data/kaggle/stocks/
# - bloomberg_news_articles.csv → data/kaggle/news/
# - news_sentiment_scores.csv → data/kaggle/news/

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your API keys and configuration
```

> **Note:** The `data/kaggle/` directory is excluded from version control due to file size. Each developer must download the datasets independently.
>
> **Why Bloomberg?** Pre-computed sentiment scores save weeks of model development and provide high-quality financial news directly relevant to S&P 500 predictions.

### Data Range Analysis

**Dataset Statistics:**
- **Bloomberg News:** 893,524 articles with sentiment scores
- **S&P 500 Stocks:** 2,515 tickers × 3,973 trading days = ~10M price points
- **Date Range:** 2006-01-03 to 2025-10-14 (complete history)
- **Overlap Period:** 2010-01-04 to 2013-11-26 (3.9 years optimal for training)

The datasets overlap from **2010-01-04 to 2013-11-26** (3.9 years, 939 trading days with both news and stock data).

To analyze the current date range coverage:

```bash
./scripts/analyze_date_range.sh
```

This script automatically:
- ✅ Finds overlapping dates between news and stock datasets
- ✅ Calculates coverage statistics
- ✅ Provides recommendations for training periods
- ✅ Works with updated datasets

### Redpanda Setup (Streaming Bus)

**Redpanda** is a Kafka-compatible streaming platform that will be automatically set up via Docker Compose. You don't need to install it manually.

```bash
# Start Redpanda
docker compose up -d

# Verify it's running
docker compose ps

# Check logs
docker compose logs -f redpanda
```

The service will be available at `localhost:19000` (Kafka API) for your application to connect to.

> **Note:** All ports are configured in `.env`. Docker Compose uses these values from your environment.

---
## 🛠 Core Tools & Architecture
- 🕸️ **Apify** — real‑time financial / macro news extraction
- 📡 **Redpanda** — unified streaming bus (historical + live mode)
- ⚙️ **TrueFoundry** — LLM reasoning with GPT / Gemini
- 🧠 **Senso Context OS** — self‑improvement via feedback learning

---
## 🧩 Project Phases
### ✅ Phase 1 — Unified Data Stream Layer
Ingestion service that outputs **historical & live data in the same format** via Redpanda topics:
- `market.news` - Financial news with sentiment scores
- `market.prices` - Stock price data

**Status:** ✅ Deployed and running on production

### ✅ Phase 2 — LLM Reasoning Layer (TrueFoundry)
Consumes streams from Phase 1 and generates AI-powered predictions:
- Correlates news events with price movements
- Uses TrueFoundry LLM for sentiment analysis
- Generates trend predictions (bullish/bearish/neutral) with confidence scores
- Publishes predictions back to Redpanda for Phase 3

**Features:**
- Real-time event correlation (news + prices)
- Periodic analysis (every 60 seconds)
- Buffered event processing
- AI-powered market predictions

**Status:** ✅ Deployed and running on production

### ✅ Phase 3 — Self-Improvement Layer (Senso Context OS)
Tracks prediction outcomes and continuously improves accuracy:
- Records all predictions made by Phase 2
- Tracks actual market outcomes (price movements)
- Calculates accuracy metrics by prediction type
- Recommends confidence thresholds based on performance
- Stores learning data in Senso Context OS

**Features:**
- Automated outcome tracking (24h evaluation window)
- Per-prediction-type accuracy (bullish/bearish/neutral)
- Dynamic confidence threshold adjustment
- Performance metrics API
- Feedback loop for strategy optimization

**Status:** ✅ Implemented and ready for deployment

### ✅ Phase 4 — Output Layer  
User-facing interfaces for real-time market insights:
- **Web Dashboard:** Beautiful real-time visualization of predictions
- **Slack Notifications:** High-confidence predictions sent to Slack
- **Insights API:** RESTful endpoints for retrieving predictions
- **Auto-refresh:** Dashboard updates every 30 seconds

**Features:**
- Real-time predictions display with confidence scores
- Color-coded prediction types (bullish/bearish/neutral)
- Performance metrics overview
- Slack integration for instant alerts
- Mobile-responsive design

**Status:** ✅ Implemented and ready for deployment

---
## 📦 Deployment & Runtime

### Production Deployment (biaz.hurated.com)

The project is deployed on `biaz.hurated.com` with all data already uploaded.

**Quick deploy (automated):**

```bash
# Deploy with commit
./scripts/deploy.sh -m "Your commit message"

# Deploy without commit (if already committed)
./scripts/deploy.sh
```

The deploy script automatically:
1. ✅ Copies `.env` to server
2. ✅ Stages and commits changes (if `-m` flag provided)
3. ✅ Pushes to GitHub
4. ✅ Pulls changes on server
5. ✅ Rebuilds Docker containers
6. ✅ Restarts services

**Manual deployment:**

```bash
# 1. Copy .env and commit changes
scp .env biaz.hurated.com:MarketPulse/
git add .
git commit -m "Your changes"
git push origin main

# 2. Update and rebuild on server
ssh biaz.hurated.com "cd MarketPulse && git pull"
ssh biaz.hurated.com "cd MarketPulse && docker compose build"
ssh biaz.hurated.com "cd MarketPulse && docker compose up -d"

# 3. Check status and logs
ssh biaz.hurated.com "cd MarketPulse && docker compose ps"
ssh biaz.hurated.com "cd MarketPulse && docker compose logs -f"
```

**Service URLs (SSL enabled):**
- **Main API:** `https://finance.biaz.hurated.com`
- **Redpanda Admin:** `https://admin.biaz.hurated.com`
- **Redpanda Kafka:** `kafka.biaz.hurated.com:443`

**Alternative (direct port access):**
- API: `http://biaz.hurated.com:16000`
- Redpanda Kafka: `biaz.hurated.com:19000`
- Redpanda Admin: `http://biaz.hurated.com:20000`

### Local Development

For local development:
```bash
cp .env.example .env
# Edit .env with your configuration
docker compose up -d
```

Full setup starts in **`TODO.md`** — that file is the entry point for implementation.

---
## 📍 API Usage Examples

### Phase 1 - Data Streaming

```bash
# Check health
curl https://finance.biaz.hurated.com/health

# Start historical data replay at 1000x speed
curl 'https://finance.biaz.hurated.com/stream?mode=historical&speed=1000'

# Start replay for specific date
curl 'https://finance.biaz.hurated.com/stream?mode=historical&date=2010-01-04&speed=10'

# Check streaming status
curl https://finance.biaz.hurated.com/stream/status

# Stop streaming
curl -X POST https://finance.biaz.hurated.com/stream/stop
```

### Phase 2 - AI Reasoning

```bash
# Start AI reasoning service
curl -X POST https://finance.biaz.hurated.com/reasoning/start

# Stop reasoning service
curl -X POST https://finance.biaz.hurated.com/reasoning/stop

# Check reasoning status (includes buffer sizes)
curl https://finance.biaz.hurated.com/stream/status | jq '.reasoning'
```

### Phase 3 - Self-Improvement

```bash
# Start self-improvement service
curl -X POST https://finance.biaz.hurated.com/improvement/start

# Stop self-improvement service
curl -X POST https://finance.biaz.hurated.com/improvement/stop

# Get performance metrics
curl https://finance.biaz.hurated.com/metrics | jq .

# Check improvement status
curl https://finance.biaz.hurated.com/stream/status | jq '.improvement'
```

### Phase 4 - Output Layer

```bash
# Access web dashboard
open https://finance.biaz.hurated.com

# Get recent predictions (for custom integrations)
curl https://finance.biaz.hurated.com/insights/recent | jq .

# Slack notifications are automatic when reasoning service is running
# Configure SLACK_WEBHOOK_URL in .env to enable
```

### Redpanda Admin

```bash
# Check cluster health
curl https://admin.biaz.hurated.com/v1/cluster/health_overview

# List topics
curl https://admin.biaz.hurated.com/v1/topics
```

---
## 📍 Example Insight Output
> **Tesla +3.2%** after battery breakthrough announcement.  
> News sentiment **0.87 (positive)** → **bullish 48h** trend confidence.

---
## Next Step
Open **`TODO.md`** and begin with **Phase 1 — Unified Data Stream Service**.

