import { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { backfillIndicatorHistory } from '../services/ingestion/worldBankHistory.js';
import { pool } from '../db/pool.js';

// In-memory state for tracking backfill progress
let backfillStatus: {
  running: boolean;
  startedAt: string | null;
  completedAt: string | null;
  current: string | null;
  completed: string[];
  failed: Array<{ type: string; error: string }>;
  total: number;
} = {
  running: false,
  startedAt: null,
  completedAt: null,
  current: null,
  completed: [],
  failed: [],
  total: 0,
};

// All World Bank indicators (excludes exchange which is daily only)
const ALL_INDICATORS = [
  { type: 'interest', id: config.indicators.interest, code: config.worldBankCodes.interest },
  { type: 'inflation', id: config.indicators.inflation, code: config.worldBankCodes.inflation },
  { type: 'gdp_per_capita', id: config.indicators.gdp_per_capita, code: config.worldBankCodes.gdp_per_capita },
  { type: 'unemployment', id: config.indicators.unemployment, code: config.worldBankCodes.unemployment },
  { type: 'government_debt', id: config.indicators.government_debt, code: config.worldBankCodes.government_debt },
  { type: 'gini', id: config.indicators.gini, code: config.worldBankCodes.gini },
  { type: 'life_expectancy', id: config.indicators.life_expectancy, code: config.worldBankCodes.life_expectancy },
  { type: 'exports', id: config.indicators.exports, code: config.worldBankCodes.exports },
  { type: 'imports', id: config.indicators.imports, code: config.worldBankCodes.imports },
  { type: 'fdi_inflows', id: config.indicators.fdi_inflows, code: config.worldBankCodes.fdi_inflows },
  { type: 'labor_force', id: config.indicators.labor_force, code: config.worldBankCodes.labor_force },
  { type: 'female_employment', id: config.indicators.female_employment, code: config.worldBankCodes.female_employment },
  { type: 'domestic_credit', id: config.indicators.domestic_credit, code: config.worldBankCodes.domestic_credit },
  { type: 'education_spending', id: config.indicators.education_spending, code: config.worldBankCodes.education_spending },
  { type: 'poverty_headcount', id: config.indicators.poverty_headcount, code: config.worldBankCodes.poverty_headcount },
  { type: 'co2_emissions', id: config.indicators.co2_emissions, code: config.worldBankCodes.co2_emissions },
  { type: 'renewable_energy', id: config.indicators.renewable_energy, code: config.worldBankCodes.renewable_energy },
];

// Only the NEW indicators added in this update
const NEW_INDICATORS = [
  { type: 'exports', id: config.indicators.exports, code: config.worldBankCodes.exports },
  { type: 'imports', id: config.indicators.imports, code: config.worldBankCodes.imports },
  { type: 'fdi_inflows', id: config.indicators.fdi_inflows, code: config.worldBankCodes.fdi_inflows },
  { type: 'labor_force', id: config.indicators.labor_force, code: config.worldBankCodes.labor_force },
  { type: 'female_employment', id: config.indicators.female_employment, code: config.worldBankCodes.female_employment },
  { type: 'domestic_credit', id: config.indicators.domestic_credit, code: config.worldBankCodes.domestic_credit },
  { type: 'education_spending', id: config.indicators.education_spending, code: config.worldBankCodes.education_spending },
  { type: 'poverty_headcount', id: config.indicators.poverty_headcount, code: config.worldBankCodes.poverty_headcount },
  { type: 'co2_emissions', id: config.indicators.co2_emissions, code: config.worldBankCodes.co2_emissions },
  { type: 'renewable_energy', id: config.indicators.renewable_energy, code: config.worldBankCodes.renewable_energy },
];

// Validate admin secret
function validateSecret(secret: string | undefined): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.warn('[Admin] ADMIN_SECRET not set - admin endpoints disabled');
    return false;
  }
  return secret === adminSecret;
}

// Run backfill in background
async function runBackfillAsync(indicators: typeof ALL_INDICATORS): Promise<void> {
  backfillStatus = {
    running: true,
    startedAt: new Date().toISOString(),
    completedAt: null,
    current: null,
    completed: [],
    failed: [],
    total: indicators.length,
  };

  console.log(`[Admin Backfill] Starting backfill for ${indicators.length} indicators`);

  for (const indicator of indicators) {
    if (!backfillStatus.running) {
      console.log('[Admin Backfill] Cancelled');
      break;
    }

    backfillStatus.current = indicator.type;
    console.log(`[Admin Backfill] Processing: ${indicator.type}`);

    try {
      await backfillIndicatorHistory(indicator.type, indicator.id, indicator.code);
      backfillStatus.completed.push(indicator.type);
      console.log(`[Admin Backfill] Completed: ${indicator.type}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      backfillStatus.failed.push({ type: indicator.type, error: errorMsg });
      console.error(`[Admin Backfill] Failed: ${indicator.type} - ${errorMsg}`);
    }

    // Wait 2 seconds between indicators to be respectful to World Bank API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  backfillStatus.running = false;
  backfillStatus.current = null;
  backfillStatus.completedAt = new Date().toISOString();
  console.log('[Admin Backfill] Finished');
}

interface BackfillQuery {
  secret?: string;
  scope?: 'all' | 'new';
}

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/backfill/status - Check backfill status (no auth required)
  fastify.get('/api/admin/backfill/status', async (_request, reply) => {
    // Get record counts for each indicator
    const countResult = await pool.query<{ indicator_type: string; count: string }>(`
      SELECT i.indicator_type, COUNT(iv.id)::text as count
      FROM indicators i
      LEFT JOIN indicator_values iv ON i.id = iv.indicator_id
      GROUP BY i.indicator_type
      ORDER BY i.indicator_type
    `);

    const recordCounts: Record<string, number> = {};
    for (const row of countResult.rows) {
      recordCounts[row.indicator_type] = parseInt(row.count, 10);
    }

    return reply.send({
      status: backfillStatus,
      recordCounts,
    });
  });

  // POST /api/admin/backfill - Start backfill (requires secret)
  fastify.post<{ Querystring: BackfillQuery }>(
    '/api/admin/backfill',
    async (request, reply) => {
      const { secret, scope = 'new' } = request.query;

      if (!validateSecret(secret)) {
        return reply.status(401).send({ 
          error: 'Unauthorized', 
          message: 'Invalid or missing ADMIN_SECRET' 
        });
      }

      if (backfillStatus.running) {
        return reply.status(409).send({ 
          error: 'Conflict', 
          message: 'Backfill already in progress',
          status: backfillStatus,
        });
      }

      const indicators = scope === 'all' ? ALL_INDICATORS : NEW_INDICATORS;
      
      // Start backfill in background (don't await)
      runBackfillAsync(indicators).catch(err => {
        console.error('[Admin Backfill] Unexpected error:', err);
        backfillStatus.running = false;
        backfillStatus.completedAt = new Date().toISOString();
      });

      return reply.status(202).send({
        message: `Backfill started for ${indicators.length} indicators (scope: ${scope})`,
        indicators: indicators.map(i => i.type),
        checkStatus: '/api/admin/backfill/status',
      });
    }
  );

  // POST /api/admin/backfill/cancel - Cancel running backfill
  fastify.post<{ Querystring: { secret?: string } }>(
    '/api/admin/backfill/cancel',
    async (request, reply) => {
      const { secret } = request.query;

      if (!validateSecret(secret)) {
        return reply.status(401).send({ 
          error: 'Unauthorized', 
          message: 'Invalid or missing ADMIN_SECRET' 
        });
      }

      if (!backfillStatus.running) {
        return reply.status(400).send({ 
          error: 'Bad Request', 
          message: 'No backfill currently running' 
        });
      }

      backfillStatus.running = false;
      return reply.send({ message: 'Backfill cancellation requested' });
    }
  );

  // POST /api/admin/ingest - Run one-time ingestion for latest data
  fastify.post<{ Querystring: { secret?: string } }>(
    '/api/admin/ingest',
    async (request, reply) => {
      const { secret } = request.query;

      if (!validateSecret(secret)) {
        return reply.status(401).send({ 
          error: 'Unauthorized', 
          message: 'Invalid or missing ADMIN_SECRET' 
        });
      }

      // Dynamic import to avoid circular dependencies
      const { runAllIngestion } = await import('../jobs/runOnce.js');
      
      // Run in background
      runAllIngestion().catch(err => {
        console.error('[Admin Ingest] Error:', err);
      });

      return reply.status(202).send({
        message: 'Ingestion started for all indicators',
      });
    }
  );
}
