import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { responseCache } from '../cache/responseCache.js';
import { ALL_INDICATOR_TYPES, IndicatorType } from '../config.js';

interface CompareDataPoint {
  year: number;
  value: number;
}

interface CountryInfo {
  code: string;
  name: string;
  region: string | null;
}

interface IndicatorSummary {
  latest: number | null;
  latestYear: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
}

interface CompareResponse {
  countries: CountryInfo[];
  data: Record<string, Record<string, CompareDataPoint[]>>;
  summary: Record<string, Record<string, IndicatorSummary>>;
}

interface CompareQuery {
  countries?: string;
  indicators?: string;
  from?: string;
  to?: string;
}

export async function compareRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Compare endpoint - gets historical data for multiple countries
   * 
   * GET /api/compare?countries=US,DE,JP&indicators=gdp_per_capita,inflation&from=1990&to=2024
   */
  fastify.get<{ Querystring: CompareQuery }>(
    '/api/compare',
    async (request, reply) => {
      const { countries, indicators, from, to } = request.query;

      // Validate countries
      if (!countries) {
        return reply.status(400).send({
          error: 'Missing required parameter: countries (comma-separated ISO2 codes)',
        });
      }

      const countryCodes = countries.split(',').map(c => c.trim().toUpperCase()).filter(c => /^[A-Z]{2}$/.test(c));
      
      if (countryCodes.length === 0) {
        return reply.status(400).send({
          error: 'Invalid country codes. Must be 2-letter ISO codes.',
        });
      }

      if (countryCodes.length > 10) {
        return reply.status(400).send({
          error: 'Too many countries. Maximum 10 countries allowed.',
        });
      }

      // Parse indicators filter
      let indicatorTypes: IndicatorType[] = ['gdp_per_capita', 'inflation'];
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
      const cacheKey = `compare:${countryCodes.sort().join(',')}:${indicatorTypes.sort().join(',')}:${fromYear}:${toYear}`;
      
      // Check cache
      const cached = responseCache.get<CompareResponse>(cacheKey);
      if (cached) {
        return reply.send(cached);
      }

      // Get country info
      const countryResult = await pool.query<{ country_code: string; name: string; region: string | null }>(
        `SELECT country_code, name, region 
         FROM countries 
         WHERE country_code = ANY($1)`,
        [countryCodes]
      );

      const countryMap = new Map<string, CountryInfo>();
      for (const row of countryResult.rows) {
        countryMap.set(row.country_code, {
          code: row.country_code,
          name: row.name,
          region: row.region,
        });
      }

      // Initialize response data structures
      const data: Record<string, Record<string, CompareDataPoint[]>> = {};
      const summary: Record<string, Record<string, IndicatorSummary>> = {};

      for (const countryCode of countryCodes) {
        data[countryCode] = {};
        summary[countryCode] = {};

        for (const indicatorType of indicatorTypes) {
          // Query historical data
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
            [countryCode, indicatorType, fromYear, toYear]
          );

          const points = result.rows.map(row => ({
            year: row.year,
            value: row.value,
          }));

          data[countryCode][indicatorType] = points;

          // Calculate summary statistics
          if (points.length > 0) {
            const values = points.map(p => p.value);
            const latestPoint = points[points.length - 1];
            
            summary[countryCode][indicatorType] = {
              latest: latestPoint.value,
              latestYear: latestPoint.year,
              min: Math.min(...values),
              max: Math.max(...values),
              avg: values.reduce((a, b) => a + b, 0) / values.length,
            };
          } else {
            summary[countryCode][indicatorType] = {
              latest: null,
              latestYear: null,
              min: null,
              max: null,
              avg: null,
            };
          }
        }
      }

      // Build countries array (preserving order from request)
      const countriesInfo: CountryInfo[] = [];
      for (const code of countryCodes) {
        const info = countryMap.get(code);
        if (info) {
          countriesInfo.push(info);
        } else {
          // Country not in database, add minimal info
          countriesInfo.push({
            code,
            name: code,
            region: null,
          });
        }
      }

      const response: CompareResponse = {
        countries: countriesInfo,
        data,
        summary,
      };

      // Cache for 1 hour
      responseCache.set(cacheKey, response, 'countries');

      return reply.send(response);
    }
  );

  /**
   * Get list of countries for comparison dropdown
   * Returns countries sorted by name with data availability count
   */
  fastify.get(
    '/api/compare/countries',
    async (_request, reply) => {
      const cacheKey = 'compare:countries:list';
      
      const cached = responseCache.get<{ countries: Array<{ code: string; name: string; region: string | null; dataPoints: number }> }>(cacheKey);
      if (cached) {
        return reply.send(cached);
      }

      const result = await pool.query<{ country_code: string; name: string; region: string | null; data_points: number }>(
        `SELECT 
           c.country_code,
           c.name,
           c.region,
           COALESCE(COUNT(iv.id), 0)::int AS data_points
         FROM countries c
         LEFT JOIN indicator_values iv ON c.country_code = iv.country_code
         GROUP BY c.country_code, c.name, c.region
         HAVING COUNT(iv.id) > 0
         ORDER BY c.name ASC`
      );

      const response = {
        countries: result.rows.map(row => ({
          code: row.country_code,
          name: row.name,
          region: row.region,
          dataPoints: row.data_points,
        })),
      };

      responseCache.set(cacheKey, response, 'countries');

      return reply.send(response);
    }
  );
}
