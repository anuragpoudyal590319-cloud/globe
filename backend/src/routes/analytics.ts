import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool.js';
import { responseCache } from '../cache/responseCache.js';
import { ALL_INDICATOR_TYPES, IndicatorType } from '../config.js';

interface DataPoint {
  year: number;
  value: number;
}

interface BulkDataCountry {
  code: string;
  name: string;
  region: string | null;
  income_level: string | null;
}

interface BulkDataResponse {
  countries: BulkDataCountry[];
  data: Record<string, Record<string, DataPoint[]>>;
  yearRange: { min: number; max: number };
}

interface CorrelationMatrix {
  labels: string[];
  matrix: number[][];
  pValues?: number[][];
}

interface CorrelationResponse {
  type: 'cross_indicator' | 'cross_country';
  correlation: CorrelationMatrix;
  sampleSize: number;
  yearRange: { from: number; to: number };
}

interface StatisticsResponse {
  indicator: string;
  year: number;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
  quartiles: { q1: number; median: number; q3: number };
  outliers: Array<{ country: string; value: number; zScore: number }>;
  distribution: Array<{ bin: number; count: number; countries: string[] }>;
}

// Helper function to calculate Pearson correlation
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return NaN;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return NaN;
  return numerator / denominator;
}

// Helper to calculate statistics
function calculateStats(values: number[]): {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
  quartiles: { q1: number; median: number; q3: number };
} {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  const percentile = (p: number) => {
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };
  
  return {
    mean,
    median: percentile(50),
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    percentiles: {
      p10: percentile(10),
      p25: percentile(25),
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
    },
    quartiles: {
      q1: percentile(25),
      median: percentile(50),
      q3: percentile(75),
    },
  };
}

interface BulkQuery {
  indicators?: string;
  from?: string;
  to?: string;
}

interface CorrelationQuery {
  type?: 'cross_indicator' | 'cross_country';
  countries?: string;
  indicators?: string;
  indicator?: string;
  from?: string;
  to?: string;
}

interface StatisticsQuery {
  indicator?: string;
  year?: string;
}

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Bulk data endpoint - get all data for specified indicators across all countries
   * GET /api/analytics/bulk?indicators=gdp_per_capita,inflation&from=1990&to=2024
   */
  fastify.get<{ Querystring: BulkQuery }>(
    '/api/analytics/bulk',
    async (request, reply) => {
      const { indicators, from, to } = request.query;

      // Parse indicators
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

      const fromYear = from ? parseInt(from, 10) : 1960;
      const toYear = to ? parseInt(to, 10) : new Date().getFullYear();

      // Cache key
      const cacheKey = `analytics:bulk:${indicatorTypes.sort().join(',')}:${fromYear}:${toYear}`;
      
      const cached = responseCache.get<BulkDataResponse>(cacheKey);
      if (cached) {
        return reply.send(cached);
      }

      // Get all countries
      const countryResult = await pool.query<{
        country_code: string;
        name: string;
        region: string | null;
        income_level: string | null;
      }>(
        `SELECT country_code, name, region, income_level FROM countries ORDER BY name`
      );

      const countries: BulkDataCountry[] = countryResult.rows.map(row => ({
        code: row.country_code,
        name: row.name,
        region: row.region,
        income_level: row.income_level,
      }));

      // Get data for all indicators and countries
      const data: Record<string, Record<string, DataPoint[]>> = {};
      let minYear = toYear;
      let maxYear = fromYear;

      for (const indicatorType of indicatorTypes) {
        const result = await pool.query<{
          country_code: string;
          year: number;
          value: number;
        }>(
          `SELECT 
             iv.country_code,
             EXTRACT(YEAR FROM iv.effective_date)::int AS year,
             iv.value
           FROM indicator_values iv
           JOIN indicators i ON iv.indicator_id = i.id
           WHERE i.indicator_type = $1
             AND EXTRACT(YEAR FROM iv.effective_date) >= $2
             AND EXTRACT(YEAR FROM iv.effective_date) <= $3
           ORDER BY iv.country_code, year`,
          [indicatorType, fromYear, toYear]
        );

        for (const row of result.rows) {
          if (!data[row.country_code]) {
            data[row.country_code] = {};
          }
          if (!data[row.country_code][indicatorType]) {
            data[row.country_code][indicatorType] = [];
          }
          data[row.country_code][indicatorType].push({
            year: row.year,
            value: row.value,
          });
          minYear = Math.min(minYear, row.year);
          maxYear = Math.max(maxYear, row.year);
        }
      }

      const response: BulkDataResponse = {
        countries,
        data,
        yearRange: { min: minYear, max: maxYear },
      };

      // Cache for 1 hour
      responseCache.set(cacheKey, response, 'countries');

      return reply.send(response);
    }
  );

  /**
   * Correlation endpoint - compute correlation matrix
   * GET /api/analytics/correlation?type=cross_indicator&countries=US,DE&indicators=gdp_per_capita,inflation
   * GET /api/analytics/correlation?type=cross_country&indicator=gdp_per_capita&countries=US,DE,JP
   */
  fastify.get<{ Querystring: CorrelationQuery }>(
    '/api/analytics/correlation',
    async (request, reply) => {
      const { type = 'cross_indicator', countries, indicators, indicator, from, to } = request.query;

      const fromYear = from ? parseInt(from, 10) : 1990;
      const toYear = to ? parseInt(to, 10) : new Date().getFullYear();

      if (type === 'cross_indicator') {
        // Cross-indicator correlation: correlate different indicators for selected countries
        if (!indicators) {
          return reply.status(400).send({
            error: 'Missing required parameter: indicators (comma-separated)',
          });
        }

        const indicatorTypes = indicators.split(',').map(s => s.trim()) as IndicatorType[];
        const validIndicators = indicatorTypes.filter(t => ALL_INDICATOR_TYPES.includes(t));
        
        if (validIndicators.length < 2) {
          return reply.status(400).send({
            error: 'Need at least 2 valid indicators for correlation',
          });
        }

        const countryCodes = countries 
          ? countries.split(',').map(c => c.trim().toUpperCase()).filter(c => /^[A-Z]{2}$/.test(c))
          : null; // null means all countries

        // Cache key
        const cacheKey = `analytics:corr:cross_ind:${validIndicators.sort().join(',')}:${countryCodes?.sort().join(',') || 'all'}:${fromYear}:${toYear}`;
        
        const cached = responseCache.get<CorrelationResponse>(cacheKey);
        if (cached) {
          return reply.send(cached);
        }

        // Fetch data for each indicator
        const indicatorData: Record<string, Record<string, number>> = {};
        
        for (const ind of validIndicators) {
          let query = `
            SELECT 
              iv.country_code,
              AVG(iv.value) as avg_value
            FROM indicator_values iv
            JOIN indicators i ON iv.indicator_id = i.id
            WHERE i.indicator_type = $1
              AND EXTRACT(YEAR FROM iv.effective_date) >= $2
              AND EXTRACT(YEAR FROM iv.effective_date) <= $3
          `;
          const params: (string | number | string[])[] = [ind, fromYear, toYear];
          
          if (countryCodes && countryCodes.length > 0) {
            query += ` AND iv.country_code = ANY($4)`;
            params.push(countryCodes);
          }
          
          query += ` GROUP BY iv.country_code`;

          const result = await pool.query<{ country_code: string; avg_value: number }>(query, params);
          
          indicatorData[ind] = {};
          for (const row of result.rows) {
            indicatorData[ind][row.country_code] = row.avg_value;
          }
        }

        // Find common countries
        const commonCountries = Object.keys(indicatorData[validIndicators[0]] || {}).filter(country =>
          validIndicators.every(ind => indicatorData[ind]?.[country] !== undefined)
        );

        if (commonCountries.length < 3) {
          return reply.status(400).send({
            error: `Not enough countries with data for all selected indicators. Found ${commonCountries.length} countries with complete data, but need at least 3. Try selecting different indicators or more countries.`,
          });
        }

        // Build correlation matrix
        const n = validIndicators.length;
        const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i === j) {
              matrix[i][j] = 1;
            } else if (j > i) {
              const x = commonCountries.map(c => indicatorData[validIndicators[i]][c]);
              const y = commonCountries.map(c => indicatorData[validIndicators[j]][c]);
              const corr = pearsonCorrelation(x, y);
              matrix[i][j] = isNaN(corr) ? 0 : Math.round(corr * 1000) / 1000;
              matrix[j][i] = matrix[i][j];
            }
          }
        }

        const response: CorrelationResponse = {
          type: 'cross_indicator',
          correlation: {
            labels: validIndicators,
            matrix,
          },
          sampleSize: commonCountries.length,
          yearRange: { from: fromYear, to: toYear },
        };

        responseCache.set(cacheKey, response, 'countries');
        return reply.send(response);

      } else if (type === 'cross_country') {
        // Cross-country correlation: correlate different countries for one indicator
        if (!indicator) {
          return reply.status(400).send({
            error: 'Missing required parameter: indicator',
          });
        }

        if (!ALL_INDICATOR_TYPES.includes(indicator as IndicatorType)) {
          return reply.status(400).send({
            error: `Invalid indicator. Must be one of: ${ALL_INDICATOR_TYPES.join(', ')}`,
          });
        }

        if (!countries) {
          return reply.status(400).send({
            error: 'Missing required parameter: countries (comma-separated)',
          });
        }

        const countryCodes = countries.split(',').map(c => c.trim().toUpperCase()).filter(c => /^[A-Z]{2}$/.test(c));
        
        if (countryCodes.length < 2) {
          return reply.status(400).send({
            error: 'Need at least 2 valid country codes',
          });
        }

        // Cache key
        const cacheKey = `analytics:corr:cross_country:${indicator}:${countryCodes.sort().join(',')}:${fromYear}:${toYear}`;
        
        const cached = responseCache.get<CorrelationResponse>(cacheKey);
        if (cached) {
          return reply.send(cached);
        }

        // Fetch time series data for each country
        const countryData: Record<string, Record<number, number>> = {};
        
        for (const countryCode of countryCodes) {
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
             ORDER BY year`,
            [countryCode, indicator, fromYear, toYear]
          );
          
          countryData[countryCode] = {};
          for (const row of result.rows) {
            countryData[countryCode][row.year] = row.value;
          }
        }

        // Find common years
        const allYears = new Set<number>();
        for (const data of Object.values(countryData)) {
          for (const year of Object.keys(data)) {
            allYears.add(parseInt(year, 10));
          }
        }
        
        const commonYears = Array.from(allYears).filter(year =>
          countryCodes.every(country => countryData[country]?.[year] !== undefined)
        ).sort((a, b) => a - b);

        if (commonYears.length < 5) {
          return reply.status(400).send({
            error: `Not enough common years with data for all selected countries. Found ${commonYears.length} years with complete data, but need at least 5. Try selecting different countries or adjusting the year range.`,
          });
        }

        // Build correlation matrix
        const n = countryCodes.length;
        const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i === j) {
              matrix[i][j] = 1;
            } else if (j > i) {
              const x = commonYears.map(year => countryData[countryCodes[i]][year]);
              const y = commonYears.map(year => countryData[countryCodes[j]][year]);
              const corr = pearsonCorrelation(x, y);
              matrix[i][j] = isNaN(corr) ? 0 : Math.round(corr * 1000) / 1000;
              matrix[j][i] = matrix[i][j];
            }
          }
        }

        // Get country names
        const nameResult = await pool.query<{ country_code: string; name: string }>(
          `SELECT country_code, name FROM countries WHERE country_code = ANY($1)`,
          [countryCodes]
        );
        const nameMap = new Map(nameResult.rows.map(r => [r.country_code, r.name]));
        const labels = countryCodes.map(c => nameMap.get(c) || c);

        const response: CorrelationResponse = {
          type: 'cross_country',
          correlation: {
            labels,
            matrix,
          },
          sampleSize: commonYears.length,
          yearRange: { from: fromYear, to: toYear },
        };

        responseCache.set(cacheKey, response, 'countries');
        return reply.send(response);
      }

      return reply.status(400).send({
        error: 'Invalid type. Must be "cross_indicator" or "cross_country"',
      });
    }
  );

  /**
   * Statistics endpoint - compute statistical summaries for a given indicator and year
   * GET /api/analytics/statistics?indicator=gdp_per_capita&year=2023
   */
  fastify.get<{ Querystring: StatisticsQuery }>(
    '/api/analytics/statistics',
    async (request, reply) => {
      const { indicator, year } = request.query;

      if (!indicator) {
        return reply.status(400).send({
          error: 'Missing required parameter: indicator',
        });
      }

      if (!ALL_INDICATOR_TYPES.includes(indicator as IndicatorType)) {
        return reply.status(400).send({
          error: `Invalid indicator. Must be one of: ${ALL_INDICATOR_TYPES.join(', ')}`,
        });
      }

      const targetYear = year ? parseInt(year, 10) : new Date().getFullYear() - 1;

      // Cache key
      const cacheKey = `analytics:stats:${indicator}:${targetYear}`;
      
      const cached = responseCache.get<StatisticsResponse>(cacheKey);
      if (cached) {
        return reply.send(cached);
      }

      // Fetch data for the specified year
      const result = await pool.query<{ country_code: string; name: string; value: number }>(
        `SELECT 
           iv.country_code,
           c.name,
           iv.value
         FROM indicator_values iv
         JOIN indicators i ON iv.indicator_id = i.id
         JOIN countries c ON iv.country_code = c.country_code
         WHERE i.indicator_type = $1
           AND EXTRACT(YEAR FROM iv.effective_date) = $2
         ORDER BY iv.value DESC`,
        [indicator, targetYear]
      );

      if (result.rows.length < 3) {
        return reply.status(400).send({
          error: `Not enough data for ${indicator} in ${targetYear}. Found data for ${result.rows.length} countries, but need at least 3. Try selecting a different year or indicator.`,
        });
      }

      const values = result.rows.map(r => r.value);
      const stats = calculateStats(values);

      // Detect outliers using IQR method
      const iqr = stats.quartiles.q3 - stats.quartiles.q1;
      const lowerBound = stats.quartiles.q1 - 1.5 * iqr;
      const upperBound = stats.quartiles.q3 + 1.5 * iqr;

      const outliers = result.rows
        .filter(r => r.value < lowerBound || r.value > upperBound)
        .map(r => ({
          country: r.name,
          value: r.value,
          zScore: Math.round(((r.value - stats.mean) / stats.stdDev) * 100) / 100,
        }));

      // Create distribution histogram (10 bins)
      const binCount = 10;
      const binWidth = (stats.max - stats.min) / binCount;
      const distribution: Array<{ bin: number; count: number; countries: string[] }> = [];

      for (let i = 0; i < binCount; i++) {
        const binStart = stats.min + i * binWidth;
        const binEnd = binStart + binWidth;
        const countriesInBin = result.rows
          .filter(r => r.value >= binStart && (i === binCount - 1 ? r.value <= binEnd : r.value < binEnd))
          .map(r => r.name);
        
        distribution.push({
          bin: Math.round((binStart + binEnd) / 2 * 100) / 100,
          count: countriesInBin.length,
          countries: countriesInBin,
        });
      }

      const response: StatisticsResponse = {
        indicator,
        year: targetYear,
        count: result.rows.length,
        mean: Math.round(stats.mean * 100) / 100,
        median: Math.round(stats.median * 100) / 100,
        stdDev: Math.round(stats.stdDev * 100) / 100,
        min: Math.round(stats.min * 100) / 100,
        max: Math.round(stats.max * 100) / 100,
        percentiles: Object.fromEntries(
          Object.entries(stats.percentiles).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
        quartiles: {
          q1: Math.round(stats.quartiles.q1 * 100) / 100,
          median: Math.round(stats.quartiles.median * 100) / 100,
          q3: Math.round(stats.quartiles.q3 * 100) / 100,
        },
        outliers,
        distribution,
      };

      // Cache for 1 hour
      responseCache.set(cacheKey, response, 'countries');

      return reply.send(response);
    }
  );

  /**
   * Rolling correlation endpoint - compute time-varying correlations
   * GET /api/analytics/rolling-correlation?indicator1=gdp_per_capita&indicator2=inflation&window=10
   */
  fastify.get<{ Querystring: { indicator1?: string; indicator2?: string; country?: string; window?: string } }>(
    '/api/analytics/rolling-correlation',
    async (request, reply) => {
      const { indicator1, indicator2, country, window = '10' } = request.query;

      if (!indicator1 || !indicator2) {
        return reply.status(400).send({
          error: 'Missing required parameters: indicator1, indicator2',
        });
      }

      if (!ALL_INDICATOR_TYPES.includes(indicator1 as IndicatorType) || 
          !ALL_INDICATOR_TYPES.includes(indicator2 as IndicatorType)) {
        return reply.status(400).send({
          error: `Invalid indicator. Must be one of: ${ALL_INDICATOR_TYPES.join(', ')}`,
        });
      }

      const windowSize = parseInt(window, 10) || 10;
      const countryCode = country?.toUpperCase() || null;

      // Cache key
      const cacheKey = `analytics:rolling:${indicator1}:${indicator2}:${countryCode || 'global'}:${windowSize}`;
      
      const cached = responseCache.get<{ years: number[]; correlations: number[] }>(cacheKey);
      if (cached) {
        return reply.send(cached);
      }

      // Fetch data for both indicators
      const fetchData = async (ind: string) => {
        let query = `
          SELECT 
            EXTRACT(YEAR FROM iv.effective_date)::int AS year,
            AVG(iv.value) as value
          FROM indicator_values iv
          JOIN indicators i ON iv.indicator_id = i.id
          WHERE i.indicator_type = $1
        `;
        const params: (string | number)[] = [ind];
        
        if (countryCode) {
          query += ` AND iv.country_code = $2`;
          params.push(countryCode);
        }
        
        query += ` GROUP BY year ORDER BY year`;

        const result = await pool.query<{ year: number; value: number }>(query, params);
        return new Map(result.rows.map(r => [r.year, r.value]));
      };

      const data1 = await fetchData(indicator1);
      const data2 = await fetchData(indicator2);

      // Find common years
      const years = Array.from(data1.keys())
        .filter(year => data2.has(year))
        .sort((a, b) => a - b);

        if (years.length < windowSize + 1) {
          return reply.status(400).send({
            error: `Not enough common years for rolling correlation. Found ${years.length} years with data for both indicators, but need at least ${windowSize + 1} (window size: ${windowSize}). Try reducing the window size or selecting different indicators.`,
          });
        }

      // Calculate rolling correlations
      const rollingYears: number[] = [];
      const correlations: number[] = [];

      for (let i = windowSize; i <= years.length; i++) {
        const windowYears = years.slice(i - windowSize, i);
        const x = windowYears.map(y => data1.get(y)!);
        const y = windowYears.map(y => data2.get(y)!);
        const corr = pearsonCorrelation(x, y);
        
        rollingYears.push(windowYears[windowYears.length - 1]);
        correlations.push(isNaN(corr) ? 0 : Math.round(corr * 1000) / 1000);
      }

      const response = {
        indicator1,
        indicator2,
        country: countryCode,
        windowSize,
        years: rollingYears,
        correlations,
      };

      responseCache.set(cacheKey, response, 'countries');
      return reply.send(response);
    }
  );
}
