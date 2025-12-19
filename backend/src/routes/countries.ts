import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { responseCache } from '../cache/responseCache.js';

interface CountryRow {
  country_code: string;
  name: string;
  region: string | null;
  income_level: string | null;
  currency_code: string | null;
}

export async function countriesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/countries', async (_request, reply) => {
    const cacheKey = 'countries:all';
    
    // Check cache first
    const cached = responseCache.get<CountryRow[]>(cacheKey);
    if (cached) {
      return reply.send(cached);
    }

    const result = await pool.query<CountryRow>(
      `SELECT country_code, name, region, income_level, currency_code
       FROM countries
       ORDER BY name`
    );

    const countries = result.rows;
    
    // Cache for 1 hour
    responseCache.set(cacheKey, countries, 'countries');

    return reply.send(countries);
  });
}

