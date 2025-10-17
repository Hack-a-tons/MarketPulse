# TODO.md — Market Pulse Analyst / Unified Data Stream Service

This service provides **both historical and real-time** streaming data for:

* `news_stream` (financial news)
* `prices_stream` (stock/crypto price ticks)

via **one interface**, switching mode based on `?date=` parameter.

It will: ✅ **replay historical data from Kaggle** into Redpanda (for backtesting)
✅ **stream live data from Apify actor** into Redpanda (for live mode)
✅ run locally as **Node.js**, then via **Docker + docker-compose.yml**

---

## 0. PREPARATION (HUMAN TASKS)

*

## 1. PROJECT STRUCTURE (PROGRAMMING)

*

```
/market-pulse-analyst
 ├─ src/
 │   ├─ index.ts                   ← HTTP /stream?date=... endpoint
 │   ├─ producers/
 │   │    ├─ replayHistorical.ts   ← send historical data → Redpanda
 │   │    ├─ streamLive.ts         ← subscribe to Apify → Redpanda
 │   └─ utils/
 │        ├─ redpandaClient.ts     ← Kafka/Redpanda wrapper
 │        ├─ parseKaggle.ts        ← read CSV files as event stream
 │        ├─ normalizeEvent.ts     ← convert raw → unified schema
 ├─ data/kaggle/                   ← Kaggle CSVs
 ├─ .env
 ├─ package.json
 ├─ docker-compose.yml
 └─ Dockerfile
```

## 2. DEFINE DATA SCHEMA (BOTH STREAMS IDENTICAL FORMAT)

*

```json
{
  "type": "news" | "price",
  "symbol": "TSLA",
  "timestamp": "2025-10-17T11:05:33Z",
  "headline": "...",        // only for type=news
  "price": 242.33,          // only for type=price
  "source": "Reuters | Apify | Kaggle",
  "meta": {...}             // fallback / extra data
}
```

*

## 3. REDPANDA SETUP (PROGRAMMING)

*

```
services:
  redpanda:
    image: redpandadata/redpanda:latest
    command: redpanda start --overprovisioned --smp 1 --memory 512M --mode dev-container
    ports:
      - "9092:9092"
```

*

## 4. API ENDPOINT / CONTROLLER (PROGRAMMING)

*

## 5. HISTORICAL MODE LOGIC

*

## 6. LIVE MODE LOGIC (APIFY)

*

## 7. TEST LOCALLY (HUMAN + PROGRAMMING)

*

## 8. DOCKERIZE SERVICE (PROGRAMMING)

*

```
FROM node:20
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["node", "dist/index.js"]
```

*

```
  pulse-service:
    build: .
    env_file: .env
    depends_on:
      - redpanda
    ports:
      - "3000:3000"
```

## 9. FINAL DEMO PREP (HUMAN)

*

