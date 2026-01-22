import { config } from '../config.js';
import { backfillIndicatorHistory } from '../services/ingestion/worldBankHistory.js';
import { pool } from '../db/pool.js';

/**
 * One-time script to backfill all historical data from World Bank
 * This fetches ALL available years for each indicator
 * 
 * Run with: npm run backfill
 */
export async function runBackfill(): Promise<void> {
  console.log('='.repeat(60));
  console.log('[Backfill] Starting historical data backfill');
  console.log('[Backfill] This will fetch ALL available years from World Bank');
  console.log('[Backfill] Estimated time: 10-15 minutes');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  // World Bank indicators to backfill (excludes exchange which is daily only)
  const indicators = [
    { type: 'interest', id: config.indicators.interest, code: config.worldBankCodes.interest },
    { type: 'inflation', id: config.indicators.inflation, code: config.worldBankCodes.inflation },
    { type: 'gdp_per_capita', id: config.indicators.gdp_per_capita, code: config.worldBankCodes.gdp_per_capita },
    { type: 'unemployment', id: config.indicators.unemployment, code: config.worldBankCodes.unemployment },
    { type: 'government_debt', id: config.indicators.government_debt, code: config.worldBankCodes.government_debt },
    { type: 'gini', id: config.indicators.gini, code: config.worldBankCodes.gini },
    { type: 'life_expectancy', id: config.indicators.life_expectancy, code: config.worldBankCodes.life_expectancy },
    // Trade indicators
    { type: 'exports', id: config.indicators.exports, code: config.worldBankCodes.exports },
    { type: 'imports', id: config.indicators.imports, code: config.worldBankCodes.imports },
    { type: 'fdi_inflows', id: config.indicators.fdi_inflows, code: config.worldBankCodes.fdi_inflows },
    // Labor indicators
    { type: 'labor_force', id: config.indicators.labor_force, code: config.worldBankCodes.labor_force },
    { type: 'female_employment', id: config.indicators.female_employment, code: config.worldBankCodes.female_employment },
    // Finance indicators
    { type: 'domestic_credit', id: config.indicators.domestic_credit, code: config.worldBankCodes.domestic_credit },
    // Development indicators
    { type: 'education_spending', id: config.indicators.education_spending, code: config.worldBankCodes.education_spending },
    { type: 'poverty_headcount', id: config.indicators.poverty_headcount, code: config.worldBankCodes.poverty_headcount },
    // Energy indicators
    { type: 'co2_emissions', id: config.indicators.co2_emissions, code: config.worldBankCodes.co2_emissions },
    { type: 'renewable_energy', id: config.indicators.renewable_energy, code: config.worldBankCodes.renewable_energy },
  ];
  
  const results: Array<{ type: string; success: boolean; error?: string }> = [];
  
  for (const indicator of indicators) {
    try {
      await backfillIndicatorHistory(indicator.type, indicator.id, indicator.code);
      results.push({ type: indicator.type, success: true });
    } catch (err) {
      results.push({ 
        type: indicator.type, 
        success: false, 
        error: err instanceof Error ? err.message : String(err) 
      });
    }
    
    // Wait 2 seconds between indicators to be respectful to the API
    console.log('[Backfill] Waiting 2 seconds before next indicator...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('[Backfill] COMPLETED');
  console.log(`[Backfill] Total time: ${elapsed} seconds`);
  console.log('[Backfill] Results:');
  
  for (const r of results) {
    if (r.success) {
      console.log(`  ✓ ${r.type}`);
    } else {
      console.log(`  ✗ ${r.type}: ${r.error}`);
    }
  }
  
  console.log('='.repeat(60));
}

// Only run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runBackfill()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Backfill] Fatal error:', err);
      pool.end().then(() => process.exit(1));
    });
}

