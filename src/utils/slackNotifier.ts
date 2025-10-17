import { IncomingWebhook } from '@slack/webhook';
import { config } from '../config/env';
import { MarketPrediction } from '../types';

class SlackNotifier {
  private webhook: IncomingWebhook | null = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = config.slack.enabled;
    if (this.isEnabled && config.slack.webhookUrl) {
      this.webhook = new IncomingWebhook(config.slack.webhookUrl);
    }
  }

  async notifyPrediction(prediction: MarketPrediction): Promise<void> {
    if (!this.isEnabled || !this.webhook || prediction.confidence < config.slack.minConfidence) {
      return;
    }

    try {
      const emoji = prediction.prediction === 'bullish' ? '🐂' : prediction.prediction === 'bearish' ? '🐻' : '➡️';
      const confidencePercent = (prediction.confidence * 100).toFixed(1);

      await this.webhook.send({
        text: `${emoji} *${prediction.prediction.toUpperCase()}* Signal (${confidencePercent}% confidence)`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${emoji} ${prediction.prediction.toUpperCase()} Prediction*\n\n*Confidence:* ${confidencePercent}%\n*Symbol:* ${prediction.symbol || 'Market'}\n*Horizon:* ${prediction.timeHorizon}\n\n*Reasoning:* ${prediction.reasoning.substring(0, 200)}...`,
            },
          },
        ],
      });

      console.log(`📨 Slack notification sent: ${prediction.prediction}`);
    } catch (error) {
      console.error('Slack notification error:', error);
    }
  }

  private getEmoji(type: string): string {
    return type === 'bullish' ? '🐂' : type === 'bearish' ? '🐻' : '➡️';
  }

  private getColor(type: string): string {
    return type === 'bullish' ? 'good' : type === 'bearish' ? 'danger' : '#808080';
  }
}

export const slackNotifier = new SlackNotifier();
