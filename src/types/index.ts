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
