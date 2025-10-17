import { Kafka, Consumer, EachMessagePayload, logLevel } from 'kafkajs';
import { config } from '../config/env';
import { MarketEvent } from '../types';

export type MessageHandler = (event: MarketEvent) => Promise<void> | void;

class RedpandaConsumer {
  private kafka: Kafka;
  private consumer: Consumer | null = null;
  private isConnected = false;
  private handlers: Map<string, MessageHandler> = new Map();

  constructor(groupId: string = 'market-pulse-reasoning') {
    this.kafka = new Kafka({
      clientId: `${config.redpanda.clientId}-consumer`,
      brokers: config.redpanda.brokers,
      logLevel: config.nodeEnv === 'production' ? logLevel.ERROR : logLevel.INFO,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected || !this.consumer) {
      return;
    }

    try {
      await this.consumer.connect();
      this.isConnected = true;
      console.log('✓ Consumer connected to Redpanda');
    } catch (error) {
      console.error('✗ Failed to connect consumer:', error);
      throw error;
    }
  }

  async subscribe(topics: string[]): Promise<void> {
    if (!this.consumer || !this.isConnected) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    try {
      await this.consumer.subscribe({
        topics,
        fromBeginning: false, // Only consume new messages
      });
      console.log(`✓ Subscribed to topics: ${topics.join(', ')}`);
    } catch (error) {
      console.error('✗ Failed to subscribe:', error);
      throw error;
    }
  }

  registerHandler(topic: string, handler: MessageHandler): void {
    this.handlers.set(topic, handler);
  }

  async start(): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not initialized');
    }

    console.log('🔄 Starting consumer...');

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        try {
          if (!message.value) {
            return;
          }

          const event: MarketEvent = JSON.parse(message.value.toString());
          const handler = this.handlers.get(topic);

          if (handler) {
            await handler(event);
          }
        } catch (error) {
          console.error(`Error processing message from ${topic}:`, error);
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('✓ Consumer disconnected from Redpanda');
    }
  }
}

export const createConsumer = (groupId?: string) => new RedpandaConsumer(groupId);
