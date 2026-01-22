import { config } from '../config.js';
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
  // Markets indicators
  fetchMarketCap,
  fetchStocksTraded,
  fetchStockTurnover,
} from '../services/ingestion/worldBank.js';
import { fetchExchangeRates } from '../services/ingestion/exchange.js';
import { upsertIndicatorValues, logIngestion } from '../services/ingestion/upsert.js';
import { pool } from '../db/pool.js';

export async function runAllIngestion(): Promise<void> {
  console.log('[RunOnce] Starting all ingestion jobs...');
  
  const jobs = [
    { name: 'exchange', id: config.indicators.exchange, fn: fetchExchangeRates },
    { name: 'interest', id: config.indicators.interest, fn: fetchInterestRates },
    { name: 'inflation', id: config.indicators.inflation, fn: fetchInflationRates },
    { name: 'gdp_per_capita', id: config.indicators.gdp_per_capita, fn: fetchGdpPerCapita },
    { name: 'unemployment', id: config.indicators.unemployment, fn: fetchUnemploymentRate },
    { name: 'government_debt', id: config.indicators.government_debt, fn: fetchGovernmentDebt },
    { name: 'gini', id: config.indicators.gini, fn: fetchGiniIndex },
    { name: 'life_expectancy', id: config.indicators.life_expectancy, fn: fetchLifeExpectancy },
    // Trade indicators
    { name: 'exports', id: config.indicators.exports, fn: fetchExports },
    { name: 'imports', id: config.indicators.imports, fn: fetchImports },
    { name: 'fdi_inflows', id: config.indicators.fdi_inflows, fn: fetchFdiInflows },
    // Labor indicators
    { name: 'labor_force', id: config.indicators.labor_force, fn: fetchLaborForce },
    { name: 'female_employment', id: config.indicators.female_employment, fn: fetchFemaleEmployment },
    // Finance indicators
    { name: 'domestic_credit', id: config.indicators.domestic_credit, fn: fetchDomesticCredit },
    // Development indicators
    { name: 'education_spending', id: config.indicators.education_spending, fn: fetchEducationSpending },
    { name: 'poverty_headcount', id: config.indicators.poverty_headcount, fn: fetchPovertyHeadcount },
    // Energy indicators
    { name: 'co2_emissions', id: config.indicators.co2_emissions, fn: fetchCo2Emissions },
    { name: 'renewable_energy', id: config.indicators.renewable_energy, fn: fetchRenewableEnergy },
    // Markets indicators
    { name: 'market_cap', id: config.indicators.market_cap, fn: fetchMarketCap },
    { name: 'stocks_traded', id: config.indicators.stocks_traded, fn: fetchStocksTraded },
    { name: 'stock_turnover', id: config.indicators.stock_turnover, fn: fetchStockTurnover },
  ];

  for (const job of jobs) {
    const startedAt = new Date();
    console.log(`\n[RunOnce] Running: ${job.name}`);
    
    try {
      const records = await job.fn();
      const result = await upsertIndicatorValues(job.id, records, startedAt);
      
      const status = result.errors.length > 0 ? 'partial' : 'success';
      await logIngestion(job.name, status, startedAt, result,
        result.errors.length > 0 ? result.errors.slice(0, 5).join('; ') : undefined);
      
      console.log(`[RunOnce] ${job.name}: inserted=${result.inserted}, updated=${result.updated}, skipped=${result.skipped}`);
      if (result.errors.length > 0) {
        console.log(`[RunOnce] ${job.name} errors:`, result.errors.slice(0, 3));
      }
    } catch (err) {
      console.error(`[RunOnce] ${job.name} failed:`, err);
      await logIngestion(job.name, 'failure', startedAt, 
        { inserted: 0, updated: 0, skipped: 0, errors: [] },
        err instanceof Error ? err.message : String(err));
    }
  }
}

// Only run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllIngestion()
    .then(() => {
      console.log('\n[RunOnce] All jobs completed');
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[RunOnce] Fatal error:', err);
      pool.end().then(() => process.exit(1));
    });
}
