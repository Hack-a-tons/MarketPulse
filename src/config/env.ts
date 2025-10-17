import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Service Configuration
  port: parseInt(process.env.PORT || '16000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Data Range
  dataStartDate: process.env.DATA_START_DATE || '2010-01-04',
  dataEndDate: process.env.DATA_END_DATE || '2013-11-26',

  // Redpanda / Kafka Configuration
  redpanda: {
    brokers: (process.env.REDPANDA_BROKERS || 'localhost:19000').split(','),
    topics: {
      news: process.env.REDPANDA_TOPIC_NEWS || 'market.news',
      prices: process.env.REDPANDA_TOPIC_PRICES || 'market.prices',
    },
    clientId: 'market-pulse-analyst',
  },

  // Apify Configuration
  apify: {
    token: process.env.APIFY_API_TOKEN,
  },

  // Data Paths
  data: {
    newsDir: process.env.DATA_NEWS_DIR || '/app/data/kaggle/news',
    stocksFile: process.env.DATA_STOCKS_FILE || '/app/data/kaggle/stocks/SnP_daily_update.csv',
  },
};
