import { Kafka, Producer, logLevel } from 'kafkajs';
import { config } from '../config/env';
import { MarketEvent } from '../types';

class RedpandaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: config.redpanda.clientId,
      brokers: config.redpanda.brokers,
      logLevel: config.nodeEnv === 'production' ? logLevel.ERROR : logLevel.INFO,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      console.log('✓ Connected to Redpanda');
    } catch (error) {
      console.error('✗ Failed to connect to Redpanda:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('✓ Disconnected from Redpanda');
    }
  }

  async publishEvent(event: MarketEvent): Promise<void> {
    if (!this.producer || !this.isConnected) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    const topic = event.type === 'news' 
      ? config.redpanda.topics.news 
      : config.redpanda.topics.prices;

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.symbol || event.timestamp,
            value: JSON.stringify(event),
            timestamp: new Date(event.timestamp).getTime().toString(),
          },
        ],
      });
    } catch (error) {
      console.error(`✗ Failed to publish ${event.type} event:`, error);
      throw error;
    }
  }

  async publishBatch(events: MarketEvent[]): Promise<void> {
    if (!this.producer || !this.isConnected) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    // Group events by type
    const newsEvents = events.filter(e => e.type === 'news');
    const priceEvents = events.filter(e => e.type === 'price');

    try {
      const promises: Promise<any>[] = [];

      if (newsEvents.length > 0) {
        promises.push(
          this.producer.send({
            topic: config.redpanda.topics.news,
            messages: newsEvents.map(event => ({
              key: event.timestamp,
              value: JSON.stringify(event),
              timestamp: new Date(event.timestamp).getTime().toString(),
            })),
          })
        );
      }

      if (priceEvents.length > 0) {
        promises.push(
          this.producer.send({
            topic: config.redpanda.topics.prices,
            messages: priceEvents.map(event => ({
              key: event.symbol || event.timestamp,
              value: JSON.stringify(event),
              timestamp: new Date(event.timestamp).getTime().toString(),
            })),
          })
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('✗ Failed to publish batch:', error);
      throw error;
    }
  }
}

// Singleton instance
export const redpandaClient = new RedpandaClient();
