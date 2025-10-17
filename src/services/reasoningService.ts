import { createConsumer } from '../utils/redpandaConsumer';
import { redpandaClient } from '../utils/redpandaClient';
import { trueFoundryClient } from '../utils/trueFoundryClient';
import { sensoClient } from '../utils/sensoClient';
import { config } from '../config/env';
import { MarketEvent, MarketPrediction } from '../types';

/**
 * Reasoning Service - Phase 2
 * Consumes news and price events, correlates them, and generates predictions
 */
export class ReasoningService {
  private newsBuffer: MarketEvent[] = [];
  private priceBuffer: MarketEvent[] = [];
  private isRunning = false;
  private consumer = createConsumer('reasoning-service');
  private analysisInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly BUFFER_SIZE = 50; // Keep last 50 events
  private readonly ANALYSIS_INTERVAL_MS = 60000; // Analyze every 60 seconds
  private readonly CORRELATION_WINDOW_MS = 3600000; // 1 hour window for correlation

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Reasoning service already running');
      return;
    }

    console.log('🧠 Starting Reasoning Service (Phase 2)...');

    try {
      // Connect consumer
      await this.consumer.connect();

      // Subscribe to topics
      await this.consumer.subscribe([
        config.redpanda.topics.news,
        config.redpanda.topics.prices,
      ]);

      // Register handlers
      this.consumer.registerHandler(config.redpanda.topics.news, (event) => {
        this.handleNewsEvent(event);
      });

      this.consumer.registerHandler(config.redpanda.topics.prices, (event) => {
        this.handlePriceEvent(event);
      });

      // Start consuming
      this.consumer.start();

      // Start periodic analysis
      this.startPeriodicAnalysis();

      this.isRunning = true;
      console.log('✅ Reasoning service started');
    } catch (error) {
      console.error('❌ Failed to start reasoning service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping reasoning service...');
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    await this.consumer.disconnect();
    this.isRunning = false;
    console.log('✅ Reasoning service stopped');
  }

  private handleNewsEvent(event: MarketEvent): void {
    // Add to buffer
    this.newsBuffer.push(event);

    // Keep buffer size limited
    if (this.newsBuffer.length > this.BUFFER_SIZE) {
      this.newsBuffer.shift();
    }

    console.log(`📰 Received news: ${event.headline?.substring(0, 60)}...`);
  }

  private handlePriceEvent(event: MarketEvent): void {
    // Add to buffer
    this.priceBuffer.push(event);

    // Keep buffer size limited
    if (this.priceBuffer.length > this.BUFFER_SIZE) {
      this.priceBuffer.shift();
    }

    console.log(`💰 Received price: ${event.symbol} = $${event.price}`);
  }

  private startPeriodicAnalysis(): void {
    console.log(`📊 Starting periodic analysis (every ${this.ANALYSIS_INTERVAL_MS / 1000}s)`);

    this.analysisInterval = setInterval(async () => {
      await this.performAnalysis();
    }, this.ANALYSIS_INTERVAL_MS);

    // Also run immediately
    this.performAnalysis();
  }

  private async performAnalysis(): Promise<void> {
    if (this.newsBuffer.length === 0 && this.priceBuffer.length === 0) {
      console.log('⏭️  Skipping analysis - no data in buffers');
      return;
    }

    console.log('');
    console.log('🔍 Performing market analysis...');
    console.log(`   News events: ${this.newsBuffer.length}`);
    console.log(`   Price events: ${this.priceBuffer.length}`);

    try {
      // Get recent events (last 10 minutes)
      const now = Date.now();
      const recentNews = this.newsBuffer.filter(e => 
        now - new Date(e.timestamp).getTime() < this.CORRELATION_WINDOW_MS
      );
      const recentPrices = this.priceBuffer.filter(e =>
        now - new Date(e.timestamp).getTime() < this.CORRELATION_WINDOW_MS
      );

      if (recentNews.length === 0 && recentPrices.length === 0) {
        console.log('   No recent events to analyze');
        return;
      }

      // Call LLM for prediction
      const prediction = await trueFoundryClient.analyzeSentiment(recentNews, recentPrices);

      if (prediction) {
        console.log(`   ✨ Prediction: ${prediction.prediction.toUpperCase()}`);
        console.log(`   📊 Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
        console.log(`   💡 Reasoning: ${prediction.reasoning.substring(0, 100)}...`);

        // Store prediction in Senso for tracking (Phase 3)
        const predictionId = await sensoClient.storePrediction(prediction);

        // Publish prediction to Redpanda with prediction ID
        await this.publishPrediction(prediction, predictionId);
      } else {
        console.log('   ⚠️  No prediction generated');
      }
    } catch (error) {
      console.error('   ❌ Analysis error:', error);
    }
  }

  private async publishPrediction(prediction: MarketPrediction, predictionId: string): Promise<void> {
    try {
      // Connect if not already connected
      await redpandaClient.connect();

      // Publish to predictions topic
      await redpandaClient.publishEvent({
        type: 'news', // Reuse the type for now, or extend MarketEvent
        timestamp: prediction.timestamp,
        symbol: prediction.symbol,
        source: 'TrueFoundry-LLM',
        meta: {
          predictionId, // Include prediction ID for Phase 3 tracking
          prediction: prediction.prediction,
          confidence: prediction.confidence,
          reasoning: prediction.reasoning,
          timeHorizon: prediction.timeHorizon,
          correlatedNews: prediction.correlatedNews,
          priceTarget: prediction.priceTarget,
        },
      });

      console.log('   ✅ Prediction published to Redpanda');
    } catch (error) {
      console.error('   ❌ Failed to publish prediction:', error);
    }
  }

  getStatus(): { running: boolean; buffers: { news: number; prices: number } } {
    return {
      running: this.isRunning,
      buffers: {
        news: this.newsBuffer.length,
        prices: this.priceBuffer.length,
      },
    };
  }
}

export const reasoningService = new ReasoningService();
