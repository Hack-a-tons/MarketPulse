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

      // Merge news and stock events by timestamp
      const events: MarketEvent[] = [];

      // Load news events
      for await (const event of parseAllNews(config.data.newsDir)) {
        if (!filterDate || event.timestamp.startsWith(filterDate)) {
          events.push(event);
        }
      }

      // Load stock events  
      console.log(`📈 Reading stock prices...`);
      for await (const event of parseStocksCSV(config.data.stocksFile)) {
        if (!filterDate || event.timestamp.startsWith(filterDate)) {
          events.push(event);
        }
      }

      // Sort all events by timestamp
      events.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      console.log(`📊 Total events to replay: ${events.length}`);
      console.log(`   News: ${events.filter(e => e.type === 'news').length}`);
      console.log(`   Prices: ${events.filter(e => e.type === 'price').length}`);

      // Replay events
      let count = 0;
      const batchSize = 100;
      let batch: MarketEvent[] = [];

      for (const event of events) {
        if (this.shouldStop) {
          console.log('⏹️  Replay stopped by user');
          break;
        }

        batch.push(event);

        if (batch.length >= batchSize) {
          await redpandaClient.publishBatch(batch);
          count += batch.length;
          
          if (count % 1000 === 0) {
            console.log(`   Published ${count}/${events.length} events...`);
          }

          batch = [];

          // Simulate real-time delay (reduced by speed multiplier)
          if (speed < 100) {
            await new Promise(resolve => setTimeout(resolve, 10 / speed));
          }
        }
      }

      // Publish remaining events
      if (batch.length > 0) {
        await redpandaClient.publishBatch(batch);
        count += batch.length;
      }

      console.log(`✅ Historical replay complete: ${count} events published`);

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
