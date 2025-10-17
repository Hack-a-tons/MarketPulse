/**
 * Unified event schema for both news and price data
 */
export interface MarketEvent {
  type: 'news' | 'price';
  symbol?: string;
  timestamp: string; // ISO 8601 format
  headline?: string; // Only for type=news
  sentiment?: number; // Only for type=news
  sentimentLabel?: string; // Only for type=news  
  price?: number; // Only for type=price
  open?: number; // Only for type=price
  high?: number; // Only for type=price
  low?: number; // Only for type=price
  close?: number; // Only for type=price
  volume?: number; // Only for type=price
  source: string; // 'Bloomberg' | 'Apify' | 'Kaggle' | etc.
  meta?: Record<string, any>; // Extra metadata
}

/**
 * Raw news data from CSV
 */
export interface NewsRow {
  Article: string;
  Date: string;
  'Sentiment Score': string;
  'Sentiment Label': string;
}

/**
 * Raw stock price data from CSV
 */
export interface StockRow {
  Date: string;
  Ticker: string;
  Open?: string;
  High?: string;
  Low?: string;
  Close?: string;
  'Adj Close'?: string;
  Volume?: string;
  [key: string]: string | undefined;
}

/**
 * Stream mode
 */
export type StreamMode = 'historical' | 'live';

/**
 * Stream configuration
 */
export interface StreamConfig {
  mode: StreamMode;
  date?: string; // For historical mode
  speed?: number; // Replay speed multiplier (1 = real-time, 10 = 10x faster)
}

/**
 * Market prediction from LLM
 */
export interface MarketPrediction {
  timestamp: string;
  symbol?: string;
  prediction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-1
  reasoning: string;
  timeHorizon: string; // e.g., "24h", "48h", "1week"
  correlatedNews?: string[]; // Headlines that influenced the prediction
  priceTarget?: number;
  meta?: Record<string, any>;
}

/**
 * Correlation between news and price
 */
export interface NewsTouch {
  newsEvent: MarketEvent;
  priceEvents: MarketEvent[];
  correlationStrength: number; // 0-1
  timeDelta: number; // milliseconds between news and price movement
}
