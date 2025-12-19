import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { countriesRoutes } from './routes/countries.js';
import { indicatorsRoutes } from './routes/indicators.js';
import { metaRoutes } from './routes/meta.js';
import { historyRoutes } from './routes/history.js';
import { startScheduler } from './jobs/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: {
    level: config.server.isProduction ? 'warn' : 'info',
  },
});

async function start(): Promise<void> {
  try {
    // Register CORS (more restrictive in production)
    await fastify.register(cors, {
      origin: config.server.isProduction ? false : true, // No CORS needed when serving static files
      methods: ['GET'],
    });

    // Register API routes
    await fastify.register(countriesRoutes);
    await fastify.register(indicatorsRoutes);
    await fastify.register(metaRoutes);
    await fastify.register(historyRoutes);

    // Health check
    fastify.get('/api/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Trigger ingestion endpoint (for initial data fetch)
    fastify.get('/api/admin/ingest', async (request, reply) => {
      // Simple security: check for a secret token (set via env var)
      const secret = process.env.INGEST_SECRET || 'dev-secret-change-in-production';
      const providedSecret = (request.query as { secret?: string }).secret || '';
      
      if (providedSecret !== secret) {
        return reply.status(401).send({ 
          error: 'Unauthorized',
          message: 'Add ?secret=YOUR_SECRET to the URL. Default secret: dev-secret-change-in-production'
        });
      }

      // Run ingestion in background (don't block the response)
      import('./jobs/runOnce.js').then(({ runAllIngestion }) => {
        runAllIngestion().catch(err => {
          console.error('[API] Ingestion error:', err);
        });
      });

      return { 
        status: 'started', 
        message: 'Ingestion started in background. Check Railway logs for progress.',
        timestamp: new Date().toISOString() 
      };
    });

    // Trigger historical backfill endpoint (fetches ALL years of data)
    fastify.get('/api/admin/backfill', async (request, reply) => {
      const secret = process.env.INGEST_SECRET || 'dev-secret-change-in-production';
      const providedSecret = (request.query as { secret?: string }).secret || '';
      
      if (providedSecret !== secret) {
        return reply.status(401).send({ 
          error: 'Unauthorized',
          message: 'Add ?secret=YOUR_SECRET to the URL'
        });
      }

      // Run backfill in background (this takes 10-15 minutes)
      import('./jobs/backfillHistory.js').then(({ runBackfill }) => {
        runBackfill().catch(err => {
          console.error('[API] Backfill error:', err);
        });
      });

      return { 
        status: 'started', 
        message: 'Historical backfill started. This takes 10-15 minutes. Check Railway logs for progress.',
        timestamp: new Date().toISOString() 
      };
    });

    // In production, serve the frontend static files
    if (config.server.isProduction) {
      const frontendDistPath = path.join(__dirname, '../../frontend/dist');
      
      // Serve static files from frontend/dist
      await fastify.register(fastifyStatic, {
        root: frontendDistPath,
        prefix: '/',
      });

      // SPA fallback: serve index.html for all non-API routes
      fastify.setNotFoundHandler(async (request, reply) => {
        // If it's an API route, return 404
        if (request.url.startsWith('/api/')) {
          return reply.status(404).send({ error: 'Not found' });
        }
        // Otherwise serve index.html for SPA routing
        return reply.sendFile('index.html');
      });

      console.log(`[Server] Serving static files from ${frontendDistPath}`);
    }

    // Start the cron scheduler
    startScheduler();

    // Start server
    await fastify.listen({ port: config.server.port, host: '0.0.0.0' });
    console.log(`[Server] Running on http://localhost:${config.server.port}`);
    console.log(`[Server] Environment: ${config.server.isProduction ? 'production' : 'development'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
