import cron from 'node-cron';
import { config } from '../config.js';
import { responseCache } from '../cache/responseCache.js';
import { 
  fetchInterestRates, 
  fetchInflationRates,
  fetchGdpPerCapita,
  fetchUnemploymentRate,
  fetchGovernmentDebt,
  fetchGiniIndex,
  fetchLifeExpectancy,
} from '../services/ingestion/worldBank.js';
import { fetchExchangeRates } from '../services/ingestion/exchange.js';
import { upsertIndicatorValues, logIngestion } from '../services/ingestion/upsert.js';
import { IngestionResult } from '../services/ingestion/types.js';

async function runIngestionJob(
  jobName: string,
  indicatorId: string,
  fetchFn: () => Promise<Array<{ countryCode: string; value: number; effectiveDate: string }>>
): Promise<void> {
  const startedAt = new Date();
  console.log(`[Scheduler] Starting job: ${jobName}`);
  
  let result: IngestionResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  
  try {
    const records = await fetchFn();
    result = await upsertIndicatorValues(indicatorId, records, startedAt);
    
    const status = result.errors.length > 0 ? 'partial' : 'success';
    await logIngestion(jobName, status, startedAt, result, 
      result.errors.length > 0 ? result.errors.slice(0, 5).join('; ') : undefined);
    
    console.log(`[Scheduler] Job ${jobName} completed: inserted=${result.inserted}, updated=${result.updated}, skipped=${result.skipped}`);
    
    // Invalidate cache after successful ingestion
    responseCache.invalidateIndicators();
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Scheduler] Job ${jobName} failed:`, errorMessage);
    await logIngestion(jobName, 'failure', startedAt, result, errorMessage);
  }
}

export function startScheduler(): void {
  const tz = config.cron.timezone;
  
  console.log(`[Scheduler] Starting with timezone: ${tz}`);
  
  // Exchange rates: daily at 02:00 UTC
  cron.schedule('0 2 * * *', () => {
    runIngestionJob('exchange', config.indicators.exchange, fetchExchangeRates);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: exchange (daily at 02:00)');
  
  // Interest rates: weekly Sunday at 03:00 UTC  
  cron.schedule('0 3 * * 0', () => {
    runIngestionJob('interest', config.indicators.interest, fetchInterestRates);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: interest (weekly Sunday at 03:00)');
  
  // All other World Bank indicators: monthly 1st at staggered times
  cron.schedule('0 4 1 * *', () => {
    runIngestionJob('inflation', config.indicators.inflation, fetchInflationRates);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: inflation (monthly 1st at 04:00)');

  cron.schedule('10 4 1 * *', () => {
    runIngestionJob('gdp_per_capita', config.indicators.gdp_per_capita, fetchGdpPerCapita);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: gdp_per_capita (monthly 1st at 04:10)');

  cron.schedule('20 4 1 * *', () => {
    runIngestionJob('unemployment', config.indicators.unemployment, fetchUnemploymentRate);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: unemployment (monthly 1st at 04:20)');

  cron.schedule('30 4 1 * *', () => {
    runIngestionJob('government_debt', config.indicators.government_debt, fetchGovernmentDebt);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: government_debt (monthly 1st at 04:30)');

  cron.schedule('40 4 1 * *', () => {
    runIngestionJob('gini', config.indicators.gini, fetchGiniIndex);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: gini (monthly 1st at 04:40)');

  cron.schedule('50 4 1 * *', () => {
    runIngestionJob('life_expectancy', config.indicators.life_expectancy, fetchLifeExpectancy);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: life_expectancy (monthly 1st at 04:50)');
}

// Export for manual runs
export { runIngestionJob };
