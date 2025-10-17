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
Designed to run locally as Node.js (dev) and via Docker using **`compose.yml`** in production.

Full setup starts in **`TODO.md`** — that file is the entry point for implementation.

---
## 📍 Example Insight Output
> **Tesla +3.2%** after battery breakthrough announcement.  
> News sentiment **0.87 (positive)** → **bullish 48h** trend confidence.

---
## Next Step
Open **`TODO.md`** and begin with **Phase 1 — Unified Data Stream Service**.

