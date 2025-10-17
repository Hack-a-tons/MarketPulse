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

The service will be available at `localhost:9092` (Kafka API) for your application to connect to.

> **Note:** All ports are configured in `.env`. Docker Compose uses these values from your environment.

---
## 🛠 Core Tools & Architecture
- 🕸️ **Apify** — real‑time financial / macro news extraction
- 📡 **Redpanda** — unified streaming bus (historical + live mode)
- ⚙️ **TrueFoundry** — LLM reasoning with GPT / Gemini
- 🧠 **Senso Context OS** — self‑improvement via feedback learning

---
## 🧩 Project Phases
### ✅ Phase 1 — Unified Data Stream Layer (start here)
See **`TODO.md`** — it defines the ingestion service that outputs **historical & live data in the same format** via Redpanda topics:
- `market.news`
- `market.prices`

### Phase 2 — LLM Reasoning Layer (TrueFoundry)
Reads the above streams → generates sentiment + trend prediction.

### Phase 3 — Self‑Improvement Layer (Senso)
Evaluates prediction accuracy → adjusts strategy automatically.

### Phase 4 — Output Layer
Slack feed, web dashboard, terminal streaming “Market Insight Cards”.

---
## 📦 Deployment & Runtime

### Production Deployment (biaz.hurated.com)

The project is deployed on `biaz.hurated.com` with all data already uploaded.

**Deploy workflow:**

```bash
# 1. Commit and push changes locally
git add .
git commit -m "Your changes"
git push origin main

# 2. Update repository on server
ssh biaz.hurated.com "cd MarketPulse && git pull"

# 3. If .env was updated, copy it to server
scp .env biaz.hurated.com:MarketPulse/

# 4. Start/restart services on server
ssh biaz.hurated.com "cd MarketPulse && docker compose up -d"

# 5. Check status
ssh biaz.hurated.com "cd MarketPulse && docker compose ps"

# 6. View logs
ssh biaz.hurated.com "cd MarketPulse && docker compose logs -f"
```

**Service URLs:**
- API: `http://biaz.hurated.com:16000`
- Redpanda Kafka: `biaz.hurated.com:9092`
- Redpanda Admin: `http://biaz.hurated.com:19092`

### Local Development

For local development:
```bash
cp .env.example .env
# Edit .env with your configuration
docker compose up -d
```

Full setup starts in **`TODO.md`** — that file is the entry point for implementation.

---
## 📍 Example Insight Output
> **Tesla +3.2%** after battery breakthrough announcement.  
> News sentiment **0.87 (positive)** → **bullish 48h** trend confidence.

---
## Next Step
Open **`TODO.md`** and begin with **Phase 1 — Unified Data Stream Service**.

