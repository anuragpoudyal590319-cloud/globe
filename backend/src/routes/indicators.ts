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

interface YearQuery {
  type?: string;
  year?: string;
}

interface YearRangeResponse {
  indicator_type: string;
  min_year: number;
  max_year: number;
  total_records: number;
}

export async function indicatorsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get latest indicator values (most recent year for each country)
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

  // Get indicator values for a specific year (for time-lapse animation)
  fastify.get<{ Querystring: YearQuery }>('/api/indicators/year', async (request, reply) => {
    const { type, year } = request.query;

    // Validate type parameter
    if (!type || !ALL_INDICATOR_TYPES.includes(type as IndicatorType)) {
      return reply.status(400).send({
        error: `Invalid or missing type parameter. Must be one of: ${ALL_INDICATOR_TYPES.join(', ')}`,
      });
    }

    // Validate year parameter
    const yearNum = year ? parseInt(year, 10) : null;
    if (!yearNum || yearNum < 1960 || yearNum > new Date().getFullYear()) {
      return reply.status(400).send({
        error: `Invalid or missing year parameter. Must be between 1960 and ${new Date().getFullYear()}`,
      });
    }

    const indicatorType = type as IndicatorType;
    const cacheKey = `indicators:year:${indicatorType}:${yearNum}`;

    // Check cache first
    const cached = responseCache.get<IndicatorValueRow[]>(cacheKey);
    if (cached) {
      return reply.send(cached);
    }

    // Query to get values for all countries for this indicator type and year
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
         AND EXTRACT(YEAR FROM iv.effective_date) = $2
       ORDER BY iv.country_code, iv.data_version DESC`,
      [indicatorType, yearNum]
    );

    const values = result.rows;

    // Cache for 1 hour (historical data doesn't change)
    responseCache.set(cacheKey, values, 'countries');

    return reply.send(values);
  });

  // Get available year range for an indicator
  fastify.get<{ Querystring: { type?: string } }>('/api/indicators/years', async (request, reply) => {
    const { type } = request.query;

    // Validate type parameter
    if (!type || !ALL_INDICATOR_TYPES.includes(type as IndicatorType)) {
      return reply.status(400).send({
        error: `Invalid or missing type parameter. Must be one of: ${ALL_INDICATOR_TYPES.join(', ')}`,
      });
    }

    const indicatorType = type as IndicatorType;
    const cacheKey = `indicators:years:${indicatorType}`;

    // Check cache first
    const cached = responseCache.get<YearRangeResponse>(cacheKey);
    if (cached) {
      return reply.send(cached);
    }

    // Query to get year range for this indicator
    const result = await pool.query<{ min_year: number; max_year: number; total: number }>(
      `SELECT 
         MIN(EXTRACT(YEAR FROM iv.effective_date))::int AS min_year,
         MAX(EXTRACT(YEAR FROM iv.effective_date))::int AS max_year,
         COUNT(*)::int AS total
       FROM indicator_values iv
       JOIN indicators i ON iv.indicator_id = i.id
       WHERE i.indicator_type = $1`,
      [indicatorType]
    );

    const response: YearRangeResponse = {
      indicator_type: indicatorType,
      min_year: result.rows[0].min_year || 1960,
      max_year: result.rows[0].max_year || new Date().getFullYear(),
      total_records: result.rows[0].total || 0,
    };

    // Cache for 1 hour
    responseCache.set(cacheKey, response, 'countries');

    return reply.send(response);
  });
}
