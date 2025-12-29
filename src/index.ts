import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import config from './config';
import { logger } from './utils/logger';
import { db } from './utils/database';
import { createApolloServer } from './graphql/server';
import { healthCheckAll } from './clients';
import { initializeWebSocketManager } from './websocket/manager';
import { usageTrackingMiddleware, flushPendingReports } from './middleware/usage-tracking';

/**
 * NexusCRM Service
 *
 * Unified CRM platform leveraging the Nexus stack:
 * - OrchestrationAgent for workflow execution
 * - MageAgent for AI reasoning
 * - GraphRAG for semantic search
 * - GeoAgent for geospatial operations
 * - Auth for multi-tenant security
 *
 * Architecture:
 * - Express HTTP server (port 9125)
 * - Apollo GraphQL server
 * - Socket.IO WebSocket server (port 9126)
 * - PostgreSQL (shared GraphRAG database)
 */

async function startServer() {
  try {
    logger.info('Starting NexusCRM service', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      wsPort: config.wsPort,
    });

    // ========================================================================
    // Initialize Database
    // ========================================================================

    logger.info('Connecting to database...');
    await db.connect();
    logger.info('Database connected successfully');

    // ========================================================================
    // Check Nexus Services Health
    // ========================================================================

    logger.info('Checking Nexus services health...');
    const servicesHealth = await healthCheckAll();

    if (!servicesHealth.allHealthy) {
      logger.warn('Some Nexus services are unavailable', {
        orchestration: servicesHealth.orchestration,
        mage: servicesHealth.mage,
        graphRAG: servicesHealth.graphRAG,
        geo: servicesHealth.geo,
        auth: servicesHealth.auth,
      });

      if (!servicesHealth.auth) {
        logger.error('Auth service is unavailable - cannot start without authentication');
        process.exit(1);
      }

      if (!servicesHealth.graphRAG.postgres) {
        logger.error('PostgreSQL is unavailable - cannot start without database');
        process.exit(1);
      }

      logger.warn('Starting with degraded functionality');
    } else {
      logger.info('All Nexus services are healthy');
    }

    // ========================================================================
    // Initialize Express Application
    // ========================================================================

    const app = express();

    // CORS configuration
    app.use(
      cors({
        origin: config.cors.origins,
        credentials: true,
      })
    );

    // Body parser middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Usage tracking middleware
    app.use(usageTrackingMiddleware);

    // Request logging middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      logger.debug('HTTP request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });

    // ========================================================================
    // Health Check Endpoints
    // ========================================================================

    app.get('/health', async (req: Request, res: Response) => {
      try {
        const dbHealthy = await db.healthCheck();
        const servicesHealth = await healthCheckAll();

        const health = {
          status: dbHealthy && servicesHealth.allHealthy ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          service: config.serviceName,
          version: '1.0.0',
          database: dbHealthy,
          services: servicesHealth,
        };

        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error: any) {
        logger.error('Health check failed', { error: error.message });
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
        });
      }
    });

    app.get('/health/ready', async (req: Request, res: Response) => {
      try {
        const dbHealthy = await db.healthCheck();
        if (dbHealthy) {
          res.status(200).json({ ready: true });
        } else {
          res.status(503).json({ ready: false });
        }
      } catch (error) {
        res.status(503).json({ ready: false });
      }
    });

    app.get('/health/live', (req: Request, res: Response) => {
      res.status(200).json({ alive: true });
    });

    // ========================================================================
    // Webhook Endpoints
    // ========================================================================

    // Vapi voice calling webhooks
    const { verifyWebhookMiddleware, handleVapiWebhook } = await import('./voice/webhook-handler');

    app.post('/webhooks/vapi', verifyWebhookMiddleware, handleVapiWebhook);

    logger.info('Webhook endpoints registered', {
      vapi: '/webhooks/vapi',
    });

    // ========================================================================
    // Initialize Apollo GraphQL Server
    // ========================================================================

    logger.info('Initializing Apollo GraphQL server...');
    const apolloServer = createApolloServer();
    await apolloServer.start();

    apolloServer.applyMiddleware({
      app: app as any,
      path: '/graphql',
      cors: false, // Already handled by Express CORS
    });

    logger.info('Apollo GraphQL server initialized', {
      path: '/graphql',
      playground: config.nodeEnv !== 'production',
    });

    // ========================================================================
    // Initialize HTTP Server
    // ========================================================================

    const httpServer = http.createServer(app);

    httpServer.listen(config.port, () => {
      logger.info('HTTP server started', {
        port: config.port,
        graphqlPath: `/graphql`,
        health: '/health',
      });
    });

    // ========================================================================
    // Initialize WebSocket Server
    // ========================================================================

    logger.info('Initializing WebSocket server...');

    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origins,
        credentials: true,
      },
      path: '/ws',
    });

    // Initialize WebSocket manager for broadcasting
    initializeWebSocketManager(io);

    // WebSocket authentication middleware
    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const authClient = (await import('./clients')).authClient;
        const authContext = await authClient.verifyToken(token);

        if (!authContext) {
          return next(new Error('Invalid token'));
        }

        // Attach auth context to socket
        (socket as any).auth = authContext;

        logger.debug('WebSocket client authenticated', {
          userId: authContext.user.id,
          organizationId: authContext.user.organizationId,
        });

        next();
      } catch (error: any) {
        logger.error('WebSocket authentication failed', { error: error.message });
        return next(new Error('Authentication failed'));
      }
    });

    // WebSocket connection handler
    io.on('connection', (socket) => {
      const auth = (socket as any).auth;

      logger.info('WebSocket client connected', {
        socketId: socket.id,
        userId: auth?.user.id,
        organizationId: auth?.user.organizationId,
      });

      // Join organization room for multi-tenant isolation
      if (auth?.user.organizationId) {
        socket.join(`org:${auth.user.organizationId}`);
      }

      // Handle voice call events
      socket.on('call:status', (data) => {
        logger.debug('Call status update', { callId: data.callId, status: data.status });
        // Broadcast to organization room
        if (auth?.user.organizationId) {
          io.to(`org:${auth.user.organizationId}`).emit('call:status', data);
        }
      });

      // Handle campaign events
      socket.on('campaign:progress', (data) => {
        logger.debug('Campaign progress update', {
          campaignId: data.campaignId,
          progress: data.progress,
        });
        // Broadcast to organization room
        if (auth?.user.organizationId) {
          io.to(`org:${auth.user.organizationId}`).emit('campaign:progress', data);
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info('WebSocket client disconnected', {
          socketId: socket.id,
          reason,
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('WebSocket error', {
          socketId: socket.id,
          error: error.message,
        });
      });
    });

    logger.info('WebSocket server initialized', {
      port: config.port,
      path: '/ws',
    });

    // ========================================================================
    // Error Handling
    // ========================================================================

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Global error handler
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
      });

      res.status(500).json({
        error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
      });
    });

    // ========================================================================
    // Graceful Shutdown
    // ========================================================================

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // Flush pending usage reports
      await flushPendingReports();
      logger.info('Usage reports flushed');

      // Stop accepting new connections
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });

      // Close WebSocket connections
      io.close(() => {
        logger.info('WebSocket server closed');
      });

      // Stop Apollo Server
      await apolloServer.stop();
      logger.info('Apollo GraphQL server stopped');

      // Close database connections
      await db.disconnect();
      logger.info('Database connections closed');

      logger.info('Graceful shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled promise rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
      });
      process.exit(1);
    });

    logger.info('NexusCRM service started successfully', {
      httpPort: config.port,
      wsPort: config.wsPort,
      graphqlPath: '/graphql',
      healthPath: '/health',
      wsPath: '/ws',
    });
  } catch (error: any) {
    logger.error('Failed to start NexusCRM service', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start the server
startServer();
