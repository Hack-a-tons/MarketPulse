import { redpandaClient } from '../utils/redpandaClient';
import { parseAllNews } from '../utils/parseNews';
import { parseStocksCSV } from '../utils/parseStocks';
import { config } from '../config/env';
import { MarketEvent } from '../types';

export class HistoricalReplayProducer {
  private isRunning = false;
  private shouldStop = false;

  async start(filterDate?: string, speed: number = 1): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Historical replay already running');
      return;
    }

    this.isRunning = true;
    this.shouldStop = false;

    console.log('🚀 Starting historical data replay...');
    console.log(`   Date filter: ${filterDate || 'all'}`);
    console.log(`   Speed: ${speed}x`);

    try {
      await redpandaClient.connect();

      // Stream events directly without loading all into memory
      console.log(`📈 Streaming stock prices (batched to avoid memory issues)...`);
      
      let newsCount = 0;
      let priceCount = 0;

      // Stream news events in batches
      const batchSize = 100;
      let batch: MarketEvent[] = [];

      for await (const event of parseAllNews(config.data.newsDir)) {
        if (this.shouldStop) break;
        if (filterDate && !event.timestamp.startsWith(filterDate)) continue;

        batch.push(event);
        newsCount++;

        if (batch.length >= batchSize) {
          await redpandaClient.publishBatch(batch);
          batch = [];
          if (newsCount % 10000 === 0) {
            console.log(`   📰 Published ${newsCount} news events...`);
          }
        }
      }

      // Publish remaining news
      if (batch.length > 0) {
        await redpandaClient.publishBatch(batch);
        batch = [];
      }

      console.log(`✅ News replay complete: ${newsCount} events published`);

      // Stream price events in batches (top 100 tickers = ~400k events)
      for await (const event of parseStocksCSV(config.data.stocksFile)) {
        if (this.shouldStop) break;
        if (filterDate && !event.timestamp.startsWith(filterDate)) continue;

        batch.push(event);
        priceCount++;

        if (batch.length >= batchSize) {
          await redpandaClient.publishBatch(batch);
          batch = [];
          if (priceCount % 10000 === 0) {
            console.log(`   💰 Published ${priceCount} price events...`);
          }
        }
      }

      // Publish remaining prices
      if (batch.length > 0) {
        await redpandaClient.publishBatch(batch);
      }

      console.log(`✅ Historical replay complete!`);
      console.log(`   News: ${newsCount} events`);
      console.log(`   Prices: ${priceCount} events`);

    } catch (error) {
      console.error('❌ Error during historical replay:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  stop(): void {
    console.log('🛑 Stopping historical replay...');
    this.shouldStop = true;
  }

  getStatus(): boolean {
    return this.isRunning;
  }
}

export const historicalReplay = new HistoricalReplayProducer();
