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
  // Trade indicators
  fetchExports,
  fetchImports,
  fetchFdiInflows,
  // Labor indicators
  fetchLaborForce,
  fetchFemaleEmployment,
  // Finance indicators
  fetchDomesticCredit,
  // Development indicators
  fetchEducationSpending,
  fetchPovertyHeadcount,
  // Energy indicators
  fetchCo2Emissions,
  fetchRenewableEnergy,
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

  // Trade indicators (monthly 1st, staggered times)
  cron.schedule('0 5 1 * *', () => {
    runIngestionJob('exports', config.indicators.exports, fetchExports);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: exports (monthly 1st at 05:00)');

  cron.schedule('10 5 1 * *', () => {
    runIngestionJob('imports', config.indicators.imports, fetchImports);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: imports (monthly 1st at 05:10)');

  cron.schedule('20 5 1 * *', () => {
    runIngestionJob('fdi_inflows', config.indicators.fdi_inflows, fetchFdiInflows);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: fdi_inflows (monthly 1st at 05:20)');

  // Labor indicators
  cron.schedule('30 5 1 * *', () => {
    runIngestionJob('labor_force', config.indicators.labor_force, fetchLaborForce);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: labor_force (monthly 1st at 05:30)');

  cron.schedule('40 5 1 * *', () => {
    runIngestionJob('female_employment', config.indicators.female_employment, fetchFemaleEmployment);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: female_employment (monthly 1st at 05:40)');

  // Finance indicator
  cron.schedule('50 5 1 * *', () => {
    runIngestionJob('domestic_credit', config.indicators.domestic_credit, fetchDomesticCredit);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: domestic_credit (monthly 1st at 05:50)');

  // Development indicators
  cron.schedule('0 6 1 * *', () => {
    runIngestionJob('education_spending', config.indicators.education_spending, fetchEducationSpending);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: education_spending (monthly 1st at 06:00)');

  cron.schedule('10 6 1 * *', () => {
    runIngestionJob('poverty_headcount', config.indicators.poverty_headcount, fetchPovertyHeadcount);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: poverty_headcount (monthly 1st at 06:10)');

  // Energy indicators
  cron.schedule('20 6 1 * *', () => {
    runIngestionJob('co2_emissions', config.indicators.co2_emissions, fetchCo2Emissions);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: co2_emissions (monthly 1st at 06:20)');

  cron.schedule('30 6 1 * *', () => {
    runIngestionJob('renewable_energy', config.indicators.renewable_energy, fetchRenewableEnergy);
  }, { timezone: tz });
  console.log('[Scheduler] Scheduled: renewable_energy (monthly 1st at 06:30)');
}

// Export for manual runs
export { runIngestionJob };
