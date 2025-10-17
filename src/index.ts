import express, { Request, Response } from 'express';
import { config } from './config/env';
import { historicalReplay } from './producers/replayHistorical';
import { liveStream } from './producers/streamLive';
import { redpandaClient } from './utils/redpandaClient';
import { reasoningService } from './services/reasoningService';

const app = express();

app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'market-pulse-analyst',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Stream control endpoint
 * 
 * Query parameters:
 * - mode: 'historical' | 'live'
 * - date: Filter by date (YYYY-MM-DD) for historical mode
 * - speed: Replay speed multiplier (default: 1)
 */
app.get('/stream', async (req: Request, res: Response) => {
  const mode = req.query.mode as string || 'historical';
  const date = req.query.date as string | undefined;
  const speed = parseInt(req.query.speed as string || '1', 10);

  try {
    if (mode === 'historical') {
      // Start historical replay in background
      historicalReplay.start(date, speed).catch(err => {
        console.error('Historical replay error:', err);
      });

      res.json({
        status: 'started',
        mode: 'historical',
        config: {
          date: date || 'all',
          speed,
          dataRange: `${config.dataStartDate} to ${config.dataEndDate}`,
        },
        message: 'Historical data replay started',
      });
    } else if (mode === 'live') {
      // Start live streaming in background
      liveStream.start().catch(err => {
        console.error('Live stream error:', err);
      });

      res.json({
        status: 'started',
        mode: 'live',
        message: 'Live data streaming started (Phase 2 - to be implemented)',
      });
    } else {
      res.status(400).json({
        error: 'Invalid mode',
        message: 'Mode must be "historical" or "live"',
      });
    }
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Stop streaming endpoint
 */
app.post('/stream/stop', (req: Request, res: Response) => {
  historicalReplay.stop();
  liveStream.stop();

  res.json({
    status: 'stopped',
    message: 'All streams stopped',
  });
});

/**
 * Status endpoint
 */
app.get('/stream/status', (req: Request, res: Response) => {
  res.json({
    historical: {
      running: historicalReplay.getStatus(),
    },
    live: {
      running: liveStream.getStatus(),
    },
    reasoning: reasoningService.getStatus(),
    config: {
      redpandaBrokers: config.redpanda.brokers,
      topics: config.redpanda.topics,
      dataRange: {
        start: config.dataStartDate,
        end: config.dataEndDate,
      },
    },
  });
});

/**
 * Start reasoning service (Phase 2)
 */
app.post('/reasoning/start', async (req: Request, res: Response) => {
  try {
    await reasoningService.start();
    
    res.json({
      status: 'started',
      message: 'Reasoning service started - consuming from Redpanda and generating predictions',
    });
  } catch (error) {
    console.error('Reasoning service error:', error);
    res.status(500).json({
      error: 'Failed to start reasoning service',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Stop reasoning service
 */
app.post('/reasoning/stop', async (req: Request, res: Response) => {
  try {
    await reasoningService.stop();
    
    res.json({
      status: 'stopped',
      message: 'Reasoning service stopped',
    });
  } catch (error) {
    console.error('Reasoning service error:', error);
    res.status(500).json({
      error: 'Failed to stop reasoning service',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Start server
 */
async function startServer() {
  try {
    // Test Redpanda connection
    console.log('🔌 Testing Redpanda connection...');
    await redpandaClient.connect();
    await redpandaClient.disconnect();
    console.log('✅ Redpanda connection successful');

    // Start HTTP server
    app.listen(config.port, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  Market Pulse Analyst - Phase 1');
      console.log('  Unified Data Stream Service');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📡 Redpanda brokers: ${config.redpanda.brokers.join(', ')}`);
      console.log(`📊 Data range: ${config.dataStartDate} to ${config.dataEndDate}`);
      console.log('');
      console.log('Endpoints:');
      console.log(`  GET  /health              - Health check`);
      console.log(`  GET  /stream              - Start streaming`);
      console.log(`  POST /stream/stop         - Stop streaming`);
      console.log(`  GET  /stream/status       - Get status`);
      console.log(`  POST /reasoning/start     - Start reasoning service (Phase 2)`);
      console.log(`  POST /reasoning/stop      - Stop reasoning service`);
      console.log('');
      console.log('Examples:');
      console.log(`  # Phase 1 - Stream data`);
      console.log(`  curl http://localhost:${config.port}/stream?mode=historical&speed=10`);
      console.log(`  # Phase 2 - Start AI reasoning`);
      console.log(`  curl -X POST http://localhost:${config.port}/reasoning/start`);
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  historicalReplay.stop();
  liveStream.stop();
  await reasoningService.stop();
  await redpandaClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  historicalReplay.stop();
  liveStream.stop();
  await reasoningService.stop();
  await redpandaClient.disconnect();
  process.exit(0);
});

// Start the server
startServer();
