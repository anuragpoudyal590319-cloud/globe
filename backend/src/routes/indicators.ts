import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { responseCache } from '../cache/responseCache.js';
import { IndicatorType, ALL_INDICATOR_TYPES } from '../config.js';

interface IndicatorValueRow {
  country_code: string;
  value: number;
  effective_date: string;
  fetched_at: string;
  source: string;
}

interface LatestQuery {
  type?: string;
}

export async function indicatorsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: LatestQuery }>('/api/indicators/latest', async (request, reply) => {
    const { type } = request.query;

    // Validate type parameter
    if (!type || !ALL_INDICATOR_TYPES.includes(type as IndicatorType)) {
      return reply.status(400).send({
        error: `Invalid or missing type parameter. Must be one of: ${ALL_INDICATOR_TYPES.join(', ')}`,
      });
    }

    const indicatorType = type as IndicatorType;
    const cacheKey = `indicators:latest:${indicatorType}`;

    // Check cache first
    const cached = responseCache.get<IndicatorValueRow[]>(cacheKey);
    if (cached) {
      return reply.send(cached);
    }

    // Query to get the latest value for each country for this indicator type
    // Uses DISTINCT ON to get one row per country, ordered by effective_date DESC, data_version DESC
    const result = await pool.query<IndicatorValueRow>(
      `SELECT DISTINCT ON (iv.country_code)
         iv.country_code,
         iv.value,
         iv.effective_date::text,
         iv.fetched_at::text,
         i.source
       FROM indicator_values iv
       JOIN indicators i ON iv.indicator_id = i.id
       WHERE i.indicator_type = $1
       ORDER BY iv.country_code, iv.effective_date DESC, iv.data_version DESC`,
      [indicatorType]
    );

    const values = result.rows;

    // Cache for 10 minutes
    responseCache.set(cacheKey, values, 'indicators');

    return reply.send(values);
  });
}
