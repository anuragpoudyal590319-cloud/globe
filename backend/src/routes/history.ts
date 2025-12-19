import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { responseCache } from '../cache/responseCache.js';
import { ALL_INDICATOR_TYPES, IndicatorType } from '../config.js';

interface HistoryDataPoint {
  year: number;
  value: number;
}

interface HistoryResponse {
  country_code: string;
  country_name: string;
  data: Record<string, HistoryDataPoint[]>;
}

interface HistoryParams {
  country_code: string;
}

interface HistoryQuery {
  indicators?: string;
  from?: string;
  to?: string;
}

export async function historyRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: HistoryParams; Querystring: HistoryQuery }>(
    '/api/history/:country_code',
    async (request, reply) => {
      const { country_code } = request.params;
      const { indicators, from, to } = request.query;

      // Validate country code
      if (!country_code || !/^[A-Z]{2}$/.test(country_code)) {
        return reply.status(400).send({
          error: 'Invalid country code. Must be 2-letter ISO code.',
        });
      }

      // Parse indicators filter
      let indicatorTypes: IndicatorType[] = ALL_INDICATOR_TYPES;
      if (indicators) {
        const requested = indicators.split(',').map(s => s.trim()) as IndicatorType[];
        indicatorTypes = requested.filter(t => ALL_INDICATOR_TYPES.includes(t));
        if (indicatorTypes.length === 0) {
          return reply.status(400).send({
            error: `Invalid indicators. Must be one or more of: ${ALL_INDICATOR_TYPES.join(', ')}`,
          });
        }
      }

      // Parse year range
      const fromYear = from ? parseInt(from, 10) : 1960;
      const toYear = to ? parseInt(to, 10) : new Date().getFullYear();

      // Cache key
      const cacheKey = `history:${country_code}:${indicatorTypes.sort().join(',')}:${fromYear}:${toYear}`;
      
      // Check cache
      const cached = responseCache.get<HistoryResponse>(cacheKey);
      if (cached) {
        return reply.send(cached);
      }

      // Get country name
      const countryResult = await pool.query<{ name: string }>(
        'SELECT name FROM countries WHERE country_code = $1',
        [country_code]
      );

      if (countryResult.rowCount === 0) {
        return reply.status(404).send({
          error: `Country not found: ${country_code}`,
        });
      }

      const countryName = countryResult.rows[0].name;

      // Query historical data for all requested indicators
      const data: Record<string, HistoryDataPoint[]> = {};

      for (const indicatorType of indicatorTypes) {
        const result = await pool.query<{ year: number; value: number }>(
          `SELECT 
             EXTRACT(YEAR FROM iv.effective_date)::int AS year,
             iv.value
           FROM indicator_values iv
           JOIN indicators i ON iv.indicator_id = i.id
           WHERE iv.country_code = $1
             AND i.indicator_type = $2
             AND EXTRACT(YEAR FROM iv.effective_date) >= $3
             AND EXTRACT(YEAR FROM iv.effective_date) <= $4
           ORDER BY year ASC`,
          [country_code, indicatorType, fromYear, toYear]
        );

        data[indicatorType] = result.rows.map(row => ({
          year: row.year,
          value: row.value,
        }));
      }

      const response: HistoryResponse = {
        country_code,
        country_name: countryName,
        data,
      };

      // Cache for 1 hour (historical data rarely changes)
      responseCache.set(cacheKey, response, 'countries');

      return reply.send(response);
    }
  );

  // Endpoint to get available year range for a country
  fastify.get<{ Params: HistoryParams }>(
    '/api/history/:country_code/range',
    async (request, reply) => {
      const { country_code } = request.params;

      if (!country_code || !/^[A-Z]{2}$/.test(country_code)) {
        return reply.status(400).send({
          error: 'Invalid country code. Must be 2-letter ISO code.',
        });
      }

      const result = await pool.query<{ min_year: number; max_year: number; count: number }>(
        `SELECT 
           MIN(EXTRACT(YEAR FROM effective_date))::int AS min_year,
           MAX(EXTRACT(YEAR FROM effective_date))::int AS max_year,
           COUNT(*)::int AS count
         FROM indicator_values
         WHERE country_code = $1`,
        [country_code]
      );

      if (result.rows[0].count === 0) {
        return reply.status(404).send({
          error: `No data found for country: ${country_code}`,
        });
      }

      return reply.send({
        country_code,
        min_year: result.rows[0].min_year,
        max_year: result.rows[0].max_year,
        data_points: result.rows[0].count,
      });
    }
  );
}

