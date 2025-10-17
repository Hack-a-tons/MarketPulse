import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { MarketPrediction } from '../types';

interface PredictionRecord {
  id: string;
  prediction: MarketPrediction;
  timestamp: string;
  outcome?: {
    actualMovement: 'up' | 'down' | 'neutral';
    priceChange: number;
    percentChange: number;
    recordedAt: string;
  };
  accuracy?: {
    correct: boolean;
    confidence: number;
  };
}

interface PerformanceMetrics {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  averageConfidence: number;
  predictionsByType: {
    bullish: { total: number; correct: number; accuracy: number };
    bearish: { total: number; correct: number; accuracy: number };
    neutral: { total: number; correct: number; accuracy: number };
  };
}

class SensoClient {
  private client: AxiosInstance;
  private isConfigured: boolean;
  private predictionCache: Map<string, PredictionRecord> = new Map();

  constructor() {
    this.isConfigured = !!(config.senso.apiKey && config.senso.orgId);

    this.client = axios.create({
      baseURL: config.senso.endpoint,
      headers: {
        'Authorization': `Bearer ${config.senso.apiKey}`,
        'X-Org-ID': config.senso.orgId || '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Store a prediction in Senso Context OS
   */
  async storePrediction(prediction: MarketPrediction): Promise<string> {
    if (!this.isConfigured) {
      console.warn('⚠️  Senso not configured, storing locally only');
      return this.storeLocally(prediction);
    }

    try {
      const record: PredictionRecord = {
        id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        prediction,
        timestamp: new Date().toISOString(),
      };

      // Store in Senso Context OS
      await this.client.post('/predictions', {
        ...record,
        context: {
          service: 'market-pulse-analyst',
          phase: 'phase-2-reasoning',
          model: 'truefoundry-llm',
        },
      });

      // Also cache locally for quick access
      this.predictionCache.set(record.id, record);

      console.log(`✅ Prediction stored in Senso: ${record.id}`);
      return record.id;
    } catch (error) {
      console.error('Failed to store prediction in Senso:', error);
      // Fallback to local storage
      return this.storeLocally(prediction);
    }
  }

  /**
   * Record actual outcome for a prediction
   */
  async recordOutcome(
    predictionId: string,
    actualMovement: 'up' | 'down' | 'neutral',
    priceChange: number,
    percentChange: number
  ): Promise<void> {
    const record = this.predictionCache.get(predictionId);
    if (!record) {
      console.warn(`Prediction ${predictionId} not found in cache`);
      return;
    }

    const outcome = {
      actualMovement,
      priceChange,
      percentChange,
      recordedAt: new Date().toISOString(),
    };

    // Calculate if prediction was correct
    const correct = this.evaluatePrediction(record.prediction.prediction, actualMovement);
    
    record.outcome = outcome;
    record.accuracy = {
      correct,
      confidence: record.prediction.confidence,
    };

    this.predictionCache.set(predictionId, record);

    if (this.isConfigured) {
      try {
        await this.client.patch(`/predictions/${predictionId}`, {
          outcome,
          accuracy: record.accuracy,
        });
        
        console.log(`✅ Outcome recorded: ${predictionId} - ${correct ? 'CORRECT' : 'INCORRECT'}`);
      } catch (error) {
        console.error('Failed to record outcome in Senso:', error);
      }
    }
  }

  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<PerformanceMetrics> {
    const records = Array.from(this.predictionCache.values()).filter(r => r.outcome);

    if (records.length === 0) {
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        averageConfidence: 0,
        predictionsByType: {
          bullish: { total: 0, correct: 0, accuracy: 0 },
          bearish: { total: 0, correct: 0, accuracy: 0 },
          neutral: { total: 0, correct: 0, accuracy: 0 },
        },
      };
    }

    const totalPredictions = records.length;
    const correctPredictions = records.filter(r => r.accuracy?.correct).length;
    const accuracy = correctPredictions / totalPredictions;
    const averageConfidence = records.reduce((sum, r) => sum + r.prediction.confidence, 0) / totalPredictions;

    // Calculate per-type metrics
    const byType = {
      bullish: records.filter(r => r.prediction.prediction === 'bullish'),
      bearish: records.filter(r => r.prediction.prediction === 'bearish'),
      neutral: records.filter(r => r.prediction.prediction === 'neutral'),
    };

    return {
      totalPredictions,
      correctPredictions,
      accuracy,
      averageConfidence,
      predictionsByType: {
        bullish: this.calculateTypeMetrics(byType.bullish),
        bearish: this.calculateTypeMetrics(byType.bearish),
        neutral: this.calculateTypeMetrics(byType.neutral),
      },
    };
  }

  /**
   * Get confidence threshold recommendation based on performance
   */
  async getRecommendedThreshold(): Promise<number> {
    const metrics = await this.getMetrics();
    
    // If accuracy is high, we can be more aggressive (lower threshold)
    // If accuracy is low, be more conservative (higher threshold)
    if (metrics.accuracy > 0.7) {
      return 0.5; // Accept predictions with 50%+ confidence
    } else if (metrics.accuracy > 0.5) {
      return 0.65; // Require 65%+ confidence
    } else {
      return 0.8; // Only act on high-confidence predictions
    }
  }

  /**
   * Store prediction locally when Senso is not available
   */
  private storeLocally(prediction: MarketPrediction): string {
    const record: PredictionRecord = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prediction,
      timestamp: new Date().toISOString(),
    };

    this.predictionCache.set(record.id, record);
    console.log(`💾 Prediction stored locally: ${record.id}`);
    return record.id;
  }

  /**
   * Evaluate if prediction was correct
   */
  private evaluatePrediction(
    predicted: 'bullish' | 'bearish' | 'neutral',
    actual: 'up' | 'down' | 'neutral'
  ): boolean {
    if (predicted === 'bullish' && actual === 'up') return true;
    if (predicted === 'bearish' && actual === 'down') return true;
    if (predicted === 'neutral' && actual === 'neutral') return true;
    return false;
  }

  /**
   * Calculate metrics for a specific prediction type
   */
  private calculateTypeMetrics(records: PredictionRecord[]) {
    const total = records.length;
    const correct = records.filter(r => r.accuracy?.correct).length;
    const accuracy = total > 0 ? correct / total : 0;

    return { total, correct, accuracy };
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.predictionCache.clear();
  }
}

export const sensoClient = new SensoClient();
