import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { MarketEvent, MarketPrediction } from '../types';

interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class TrueFoundryClient {
  private client: AxiosInstance;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(config.trueFoundry.apiKey && config.trueFoundry.workspace);

    this.client = axios.create({
      baseURL: config.trueFoundry.endpoint,
      headers: {
        'Authorization': `Bearer ${config.trueFoundry.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Generate market prediction using LLM
   */
  async analyzeSentiment(newsEvents: MarketEvent[], priceEvents: MarketEvent[]): Promise<MarketPrediction | null> {
    if (!this.isConfigured) {
      console.warn('⚠️  TrueFoundry not configured, skipping analysis');
      return null;
    }

    try {
      const prompt = this.buildPrompt(newsEvents, priceEvents);

      const request: LLMRequest = {
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst. Analyze market news and price data to predict short-term trends. Respond in JSON format with: prediction (bullish/bearish/neutral), confidence (0-1), reasoning, timeHorizon, and optional priceTarget.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 500,
      };

      const response = await this.client.post<LLMResponse>('/chat/completions', request);
      
      if (response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;
        return this.parsePrediction(content, newsEvents, priceEvents);
      }

      return null;
    } catch (error) {
      console.error('Error calling TrueFoundry API:', error);
      return null;
    }
  }

  /**
   * Build prompt for LLM from events
   */
  private buildPrompt(newsEvents: MarketEvent[], priceEvents: MarketEvent[]): string {
    const headlines = newsEvents
      .map(e => `- ${e.headline} (Sentiment: ${e.sentimentLabel}, Score: ${e.sentiment?.toFixed(2)})`)
      .join('\n');

    const prices = priceEvents
      .map(e => `- ${e.symbol}: $${e.price?.toFixed(2)}`)
      .join('\n');

    return `Analyze the following market data:

**Recent News:**
${headlines || 'No news'}

**Current Prices:**
${prices || 'No price data'}

Provide a prediction for the next 24-48 hours.`;
  }

  /**
   * Parse LLM response into MarketPrediction
   */
  private parsePrediction(
    content: string,
    newsEvents: MarketEvent[],
    priceEvents: MarketEvent[]
  ): MarketPrediction {
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          timestamp: new Date().toISOString(),
          symbol: priceEvents[0]?.symbol,
          prediction: parsed.prediction || 'neutral',
          confidence: parsed.confidence || 0.5,
          reasoning: parsed.reasoning || content,
          timeHorizon: parsed.timeHorizon || '24h',
          correlatedNews: newsEvents.map(e => e.headline || '').filter(Boolean),
          priceTarget: parsed.priceTarget,
        };
      }
    } catch (e) {
      // JSON parsing failed, extract manually
    }

    // Fallback: Extract prediction from text
    const contentLower = content.toLowerCase();
    let prediction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    if (contentLower.includes('bullish') || contentLower.includes('positive') || contentLower.includes('upward')) {
      prediction = 'bullish';
    } else if (contentLower.includes('bearish') || contentLower.includes('negative') || contentLower.includes('downward')) {
      prediction = 'bearish';
    }

    return {
      timestamp: new Date().toISOString(),
      symbol: priceEvents[0]?.symbol,
      prediction,
      confidence: 0.5,
      reasoning: content,
      timeHorizon: '24h',
      correlatedNews: newsEvents.map(e => e.headline || '').filter(Boolean),
    };
  }
}

export const trueFoundryClient = new TrueFoundryClient();
