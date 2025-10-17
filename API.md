# Market Pulse Analyst - REST API Documentation

## Base URL
- **Production:** `https://finance.biaz.hurated.com`
- **Alternative:** `http://biaz.hurated.com:16000`

## Authentication
Currently no authentication required (add API keys for production use)

---

## Endpoints

### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "market-pulse-analyst",
  "version": "1.0.0",
  "timestamp": "2025-10-17T23:47:00.000Z"
}
```

---

### 2. Get System Status
```http
GET /stream/status
```

**Response:**
```json
{
  "historical": {
    "running": true
  },
  "live": {
    "running": false
  },
  "reasoning": {
    "running": true,
    "buffers": {
      "news": 50,
      "prices": 50
    }
  },
  "improvement": {
    "running": true,
    "pending": 0,
    "bufferSize": 5600
  },
  "config": {
    "redpandaBrokers": ["redpanda:9092"],
    "topics": {
      "news": "market.news",
      "prices": "market.prices"
    },
    "dataRange": {
      "start": "2010-01-04",
      "end": "2013-11-26"
    }
  }
}
```

---

### 3. Get Performance Metrics
```http
GET /metrics
```

**Response:**
```json
{
  "totalPredictions": 0,
  "generatedPredictions": 5,
  "correctPredictions": 0,
  "accuracy": 0,
  "averageConfidence": 0,
  "predictionsByType": {
    "bullish": {
      "total": 0,
      "correct": 0,
      "accuracy": 0
    },
    "bearish": {
      "total": 0,
      "correct": 0,
      "accuracy": 0
    },
    "neutral": {
      "total": 0,
      "correct": 0,
      "accuracy": 0
    }
  },
  "recentPredictions": [
    {
      "prediction": "bearish",
      "confidence": 0.9,
      "timestamp": "2025-10-17T23:44:53.234Z"
    }
  ],
  "timestamp": "2025-10-17T23:47:00.000Z"
}
```

**Fields:**
- `totalPredictions`: Number of evaluated predictions (after 24h)
- `generatedPredictions`: Number of predictions created (immediate)
- `accuracy`: Overall accuracy percentage (0-1)
- `averageConfidence`: Average confidence of predictions (0-1)

---

### 4. Get Recent Predictions
```http
GET /insights/recent
```

**Response:**
```json
{
  "predictions": [
    {
      "timestamp": "2025-10-17T23:44:53.234Z",
      "symbol": "MARKET",
      "prediction": "bearish",
      "confidence": 0.9,
      "reasoning": "Based on sentiment analysis of 48 recent news articles (avg sentiment: 10.0%), the market shows bearish signals. Key factors: Fannie Mae warns...",
      "timeHorizon": "24h",
      "correlatedNews": [
        "Fannie Mae Warns Servicers on Mortgage Insurance",
        "Orange-juice futures advanced...",
        "Cotton futures fell..."
      ],
      "priceTarget": null
    }
  ],
  "count": 3,
  "timestamp": "2025-10-17T23:47:00.000Z"
}
```

**Query Parameters:**
- None (returns last 20 predictions)

---

### 5. Control Endpoints

#### Start Historical Data Stream
```http
GET /stream?mode=historical&speed=1000&date=2010-01-04
```

**Parameters:**
- `mode`: `historical` or `live`
- `speed`: Replay speed multiplier (e.g., 1000 = 1000x faster)
- `date`: Optional, specific date to replay (YYYY-MM-DD) or "all"

**Response:**
```json
{
  "status": "started",
  "mode": "historical",
  "config": {
    "date": "all",
    "speed": 1000,
    "dataRange": "2010-01-04 to 2013-11-26"
  },
  "message": "Historical data replay started"
}
```

#### Stop Data Stream
```http
POST /stream/stop
```

#### Start AI Reasoning Service
```http
POST /reasoning/start
```

#### Stop AI Reasoning Service
```http
POST /reasoning/stop
```

#### Start Self-Improvement Service
```http
POST /improvement/start
```

#### Stop Self-Improvement Service
```http
POST /improvement/stop
```

---

## Example Integrations

### JavaScript/TypeScript
```typescript
// Fetch recent predictions
const response = await fetch('https://finance.biaz.hurated.com/insights/recent');
const data = await response.json();

data.predictions.forEach(pred => {
  console.log(`${pred.prediction.toUpperCase()}: ${(pred.confidence * 100).toFixed(1)}%`);
  console.log(`Reasoning: ${pred.reasoning.substring(0, 100)}...`);
});
```

### Python
```python
import requests

# Get metrics
response = requests.get('https://finance.biaz.hurated.com/metrics')
metrics = response.json()

print(f"Accuracy: {metrics['accuracy'] * 100:.1f}%")
print(f"Generated: {metrics['generatedPredictions']}")
print(f"Evaluated: {metrics['totalPredictions']}")

# Get recent predictions
predictions = requests.get('https://finance.biaz.hurated.com/insights/recent').json()
for pred in predictions['predictions'][:5]:
    print(f"{pred['prediction'].upper()} - {pred['confidence']*100:.1f}% confidence")
```

### cURL
```bash
# Get status
curl https://finance.biaz.hurated.com/stream/status | jq

# Get predictions
curl https://finance.biaz.hurated.com/insights/recent | jq '.predictions[0:5]'

# Get metrics
curl https://finance.biaz.hurated.com/metrics | jq '{generated: .generatedPredictions, accuracy: .accuracy}'

# Start services
curl -X POST https://finance.biaz.hurated.com/reasoning/start
curl -X POST https://finance.biaz.hurated.com/improvement/start
```

---

## WebSocket Support (Future)

**Planned for real-time updates:**
```javascript
const ws = new WebSocket('wss://finance.biaz.hurated.com/ws');

ws.on('prediction', (data) => {
  console.log('New prediction:', data);
});

ws.on('metric_update', (data) => {
  console.log('Metrics updated:', data);
});
```

---

## Rate Limiting

Currently no rate limiting. For production:
- **Recommended:** 100 requests/minute per IP
- **Burst:** 20 requests/second

---

## Error Responses

```json
{
  "error": "Failed to get metrics",
  "message": "Service temporarily unavailable",
  "timestamp": "2025-10-17T23:47:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request
- `500` - Internal Server Error

---

## CORS

CORS is enabled for all origins. For production, configure specific domains:
```javascript
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true
}));
```

---

## SDK Libraries (Future)

### JavaScript/TypeScript SDK
```bash
npm install @marketpulse/sdk
```

```typescript
import { MarketPulseClient } from '@marketpulse/sdk';

const client = new MarketPulseClient('https://finance.biaz.hurated.com');

// Get predictions
const predictions = await client.getPredictions();

// Subscribe to updates
client.on('newPrediction', (prediction) => {
  console.log(prediction);
});

// Get metrics
const metrics = await client.getMetrics();
console.log(`Accuracy: ${metrics.accuracy}%`);
```

### Python SDK
```bash
pip install marketpulse-sdk
```

```python
from marketpulse import Client

client = Client('https://finance.biaz.hurated.com')

# Get predictions
predictions = client.get_predictions()

# Stream updates
for prediction in client.stream_predictions():
    print(f"{prediction.type}: {prediction.confidence}%")
```

---

## Use Cases

### Trading Bot Integration
```python
# Example: Automated trading based on predictions
client = MarketPulseClient(api_url)

while True:
    predictions = client.get_predictions(limit=1)
    latest = predictions[0]
    
    if latest.confidence > 0.8:
        if latest.prediction == 'bullish':
            broker.buy(latest.symbol, amount=100)
        elif latest.prediction == 'bearish':
            broker.sell(latest.symbol, amount=100)
    
    time.sleep(60)
```

### Slack Bot
```javascript
// Example: Post predictions to Slack
const predictions = await fetch(`${API_URL}/insights/recent`).then(r => r.json());

if (predictions.count > 0) {
  const latest = predictions.predictions[0];
  if (latest.confidence > 0.7) {
    await postToSlack({
      text: `🎯 ${latest.prediction.toUpperCase()} Signal`,
      fields: [
        { title: 'Confidence', value: `${(latest.confidence * 100).toFixed(1)}%` },
        { title: 'Reasoning', value: latest.reasoning.substring(0, 200) }
      ]
    });
  }
}
```

### Dashboard Integration
```typescript
// Example: Real-time dashboard
setInterval(async () => {
  const [status, metrics, predictions] = await Promise.all([
    fetch(`${API_URL}/stream/status`).then(r => r.json()),
    fetch(`${API_URL}/metrics`).then(r => r.json()),
    fetch(`${API_URL}/insights/recent`).then(r => r.json())
  ]);
  
  updateDashboard({ status, metrics, predictions });
}, 15000);
```

---

## Support

For API support and questions:
- **GitHub:** [Hack-a-tons/MarketPulse](https://github.com/Hack-a-tons/MarketPulse)
- **Issues:** Open an issue with the `api` label

---

## Changelog

### v1.0.0 (2025-10-17)
- Initial API release
- Basic CRUD endpoints
- Real-time metrics
- Prediction history
- System status
