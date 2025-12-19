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

