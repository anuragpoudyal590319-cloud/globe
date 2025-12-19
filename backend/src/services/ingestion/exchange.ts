import axios from 'axios';
import { pool } from '../../db/pool.js';
import { config } from '../../config.js';
import { IndicatorRecord } from './types.js';

interface OpenERResponse {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

// Get currency to country mapping from our database
async function getCurrencyToCountryMap(): Promise<Map<string, string[]>> {
  const result = await pool.query<{ country_code: string; currency_code: string }>(
    `SELECT country_code, currency_code FROM countries WHERE currency_code IS NOT NULL`
  );
  
  const map = new Map<string, string[]>();
  for (const row of result.rows) {
    const countries = map.get(row.currency_code) || [];
    countries.push(row.country_code);
    map.set(row.currency_code, countries);
  }
  
  return map;
}

export async function fetchExchangeRates(): Promise<IndicatorRecord[]> {
  console.log('[Exchange] Fetching exchange rates from Open ER API...');
  
  const response = await axios.get<OpenERResponse>(config.apis.openExchangeRates);
  
  if (response.data.result !== 'success') {
    throw new Error('Exchange rate API returned non-success result');
  }

  const rates = response.data.rates;
  const updateTime = response.data.time_last_update_utc;
  
  // Parse the update time to get effective date
  const effectiveDate = new Date(updateTime).toISOString().split('T')[0];
  
  console.log(`[Exchange] Received ${Object.keys(rates).length} currency rates`);
  
  // Get currency to country mapping
  const currencyMap = await getCurrencyToCountryMap();
  
  const records: IndicatorRecord[] = [];
  
  for (const [currency, rate] of Object.entries(rates)) {
    const countries = currencyMap.get(currency);
    if (!countries) continue;
    
    // Assign the rate to all countries using this currency
    for (const countryCode of countries) {
      records.push({
        countryCode,
        value: rate,
        effectiveDate,
      });
    }
  }
  
  console.log(`[Exchange] Mapped to ${records.length} country records`);
  
  return records;
}

