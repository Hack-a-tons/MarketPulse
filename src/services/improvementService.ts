import { createConsumer } from '../utils/redpandaConsumer';
import { sensoClient } from '../utils/sensoClient';
import { config } from '../config/env';
import { MarketEvent } from '../types';

/**
 * Self-Improvement Service - Phase 3
 * Tracks prediction outcomes and adjusts strategy based on performance
 */
export class ImprovementService {
  private priceBuffer: Map<string, MarketEvent[]> = new Map(); // symbol -> recent prices
  private pendingPredictions: Map<string, { predictionId: string; baselinePrice: number; timestamp: number }> = new Map();
  private isRunning = false;
  private consumer = createConsumer('improvement-service');
  private evaluationInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly PRICE_BUFFER_SIZE = 100;
  private readonly EVALUATION_WINDOW_MS = 86400000; // 24 hours to evaluate predictions
  private readonly EVALUATION_INTERVAL_MS = 300000; // Check every 5 minutes

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Improvement service already running');
      return;
    }

    console.log('🧠 Starting Self-Improvement Service (Phase 3)...');

    try {
      // Connect consumer
      await this.consumer.connect();

      // Subscribe to topics
      await this.consumer.subscribe([
        config.redpanda.topics.prices,
        config.redpanda.topics.news, // For predictions with meta
      ]);

      // Register handlers
      this.consumer.registerHandler(config.redpanda.topics.prices, (event) => {
        this.handlePriceEvent(event);
      });

      this.consumer.registerHandler(config.redpanda.topics.news, (event) => {
        this.handlePredictionEvent(event);
      });

      // Start consuming
      this.consumer.start();

      // Start periodic evaluation
      this.startPeriodicEvaluation();

      this.isRunning = true;
      console.log('✅ Self-improvement service started');
      console.log(`   Evaluation window: ${this.EVALUATION_WINDOW_MS / 3600000} hours`);
      console.log(`   Check interval: ${this.EVALUATION_INTERVAL_MS / 60000} minutes`);
    } catch (error) {
      console.error('❌ Failed to start improvement service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping improvement service...');
    
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }

    await this.consumer.disconnect();
    this.isRunning = false;
    console.log('✅ Improvement service stopped');
  }

  private handlePriceEvent(event: MarketEvent): void {
    if (!event.symbol || !event.price) return;

    // Add to symbol-specific buffer
    if (!this.priceBuffer.has(event.symbol)) {
      this.priceBuffer.set(event.symbol, []);
    }

    const buffer = this.priceBuffer.get(event.symbol)!;
    buffer.push(event);

    // Keep buffer size limited
    if (buffer.length > this.PRICE_BUFFER_SIZE) {
      buffer.shift();
    }
  }

  private handlePredictionEvent(event: MarketEvent): void {
    // Check if this event contains a prediction (from Phase 2)
    if (event.source === 'TrueFoundry-LLM' && event.meta?.prediction) {
      const symbol = event.symbol || 'MARKET';
      const prediction = event.meta.prediction;
      const predictionId = event.meta.predictionId || `pred_${Date.now()}`;

      // Get baseline price
      const priceEvents = this.priceBuffer.get(symbol) || [];
      const baselinePrice = priceEvents.length > 0 
        ? priceEvents[priceEvents.length - 1].price || 0
        : 0;

      if (baselinePrice > 0) {
        // Store for later evaluation
        this.pendingPredictions.set(predictionId, {
          predictionId,
          baselinePrice,
          timestamp: Date.now(),
        });

        console.log(`📝 Tracking prediction: ${predictionId} (${symbol} @ $${baselinePrice.toFixed(2)})`);
      }
    }
  }

  private startPeriodicEvaluation(): void {
    console.log(`📊 Starting periodic evaluation (every ${this.EVALUATION_INTERVAL_MS / 60000} min)`);

    this.evaluationInterval = setInterval(async () => {
      await this.evaluatePendingPredictions();
    }, this.EVALUATION_INTERVAL_MS);

    // Also run immediately after a delay
    setTimeout(() => this.evaluatePendingPredictions(), 60000); // Wait 1 min for some data
  }

  private async evaluatePendingPredictions(): Promise<void> {
    const now = Date.now();
    const evaluated: string[] = [];

    console.log('');
    console.log('🔍 Evaluating pending predictions...');
    console.log(`   Pending: ${this.pendingPredictions.size}`);

    for (const [predictionId, data] of this.pendingPredictions.entries()) {
      const age = now - data.timestamp;

      // Only evaluate predictions that are old enough (24h)
      if (age < this.EVALUATION_WINDOW_MS) {
        continue;
      }

      // Find matching symbol from prediction ID or use general market
      const symbol = 'MARKET'; // In real implementation, extract from prediction
      const currentPrices = this.priceBuffer.get(symbol);

      if (!currentPrices || currentPrices.length === 0) {
        console.log(`   ⏭️  Skipping ${predictionId} - no price data`);
        continue;
      }

      // Get latest price
      const latestPrice = currentPrices[currentPrices.length - 1].price || 0;
      const priceChange = latestPrice - data.baselinePrice;
      const percentChange = (priceChange / data.baselinePrice) * 100;

      // Determine actual movement
      let actualMovement: 'up' | 'down' | 'neutral';
      if (percentChange > 1) {
        actualMovement = 'up';
      } else if (percentChange < -1) {
        actualMovement = 'down';
      } else {
        actualMovement = 'neutral';
      }

      // Record outcome
      await sensoClient.recordOutcome(
        predictionId,
        actualMovement,
        priceChange,
        percentChange
      );

      console.log(`   ✅ Evaluated: ${predictionId}`);
      console.log(`      Price: $${data.baselinePrice.toFixed(2)} → $${latestPrice.toFixed(2)} (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(2)}%)`);
      console.log(`      Movement: ${actualMovement.toUpperCase()}`);

      evaluated.push(predictionId);
    }

    // Remove evaluated predictions
    evaluated.forEach(id => this.pendingPredictions.delete(id));

    if (evaluated.length > 0) {
      // Get updated metrics
      const metrics = await sensoClient.getMetrics();
      console.log('');
      console.log('📊 Updated Performance Metrics:');
      console.log(`   Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
      console.log(`   Total Predictions: ${metrics.totalPredictions}`);
      console.log(`   Correct: ${metrics.correctPredictions}`);
      console.log(`   Avg Confidence: ${(metrics.averageConfidence * 100).toFixed(1)}%`);

      // Get recommended threshold
      const threshold = await sensoClient.getRecommendedThreshold();
      console.log(`   💡 Recommended Confidence Threshold: ${(threshold * 100).toFixed(0)}%`);
    }
  }

  getStatus(): { running: boolean; pending: number; bufferSize: number } {
    return {
      running: this.isRunning,
      pending: this.pendingPredictions.size,
      bufferSize: Array.from(this.priceBuffer.values()).reduce((sum, arr) => sum + arr.length, 0),
    };
  }

  async getMetrics() {
    return await sensoClient.getMetrics();
  }
}

export const improvementService = new ImprovementService();
