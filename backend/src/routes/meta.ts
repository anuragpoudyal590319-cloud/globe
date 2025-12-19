import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { responseCache } from '../cache/responseCache.js';

interface LastUpdatedRow {
  job_name: string;
  finished_at: string;
  items_inserted: number;
  items_updated: number;
}

interface CountRow {
  indicator_type: string;
  count: string;
}

interface MetaResponse {
  lastIngestion: Record<string, {
    finishedAt: string;
    itemsInserted: number;
    itemsUpdated: number;
  }>;
  dataCounts: Record<string, number>;
  serverTime: string;
}

export async function metaRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/meta/last-updated', async (_request, reply) => {
    const cacheKey = 'meta:last-updated';

    // Check cache first
    const cached = responseCache.get<MetaResponse>(cacheKey);
    if (cached) {
      return reply.send(cached);
    }

    // Get last successful ingestion for each job type
    const ingestionResult = await pool.query<LastUpdatedRow>(`
      SELECT DISTINCT ON (job_name)
        job_name,
        finished_at::text,
        items_inserted,
        items_updated
      FROM ingestion_logs
      WHERE status = 'success'
      ORDER BY job_name, finished_at DESC
    `);

    // Get count of indicator values by type
    const countResult = await pool.query<CountRow>(`
      SELECT i.indicator_type, COUNT(iv.id)::text as count
      FROM indicators i
      LEFT JOIN indicator_values iv ON i.id = iv.indicator_id
      GROUP BY i.indicator_type
    `);

    const lastIngestion: MetaResponse['lastIngestion'] = {};
    for (const row of ingestionResult.rows) {
      lastIngestion[row.job_name] = {
        finishedAt: row.finished_at,
        itemsInserted: row.items_inserted,
        itemsUpdated: row.items_updated,
      };
    }

    const dataCounts: MetaResponse['dataCounts'] = {};
    for (const row of countResult.rows) {
      dataCounts[row.indicator_type] = parseInt(row.count, 10);
    }

    const response: MetaResponse = {
      lastIngestion,
      dataCounts,
      serverTime: new Date().toISOString(),
    };

    // Cache for 5 minutes
    responseCache.set(cacheKey, response, 'meta');

    return reply.send(response);
  });
}

