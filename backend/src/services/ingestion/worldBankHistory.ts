import axios from 'axios';
import { config } from '../../config.js';
import { pool } from '../../db/pool.js';
import { IndicatorRecord } from './types.js';

interface WorldBankDataPoint {
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  indicator: { id: string; value: string };
}

interface WorldBankMeta {
  page: number;
  pages: number;
  per_page: number;
  total: number;
}

// ISO3 to ISO2 mapping cache
let iso3ToIso2Map: Map<string, string> | null = null;

async function getIso3ToIso2Map(): Promise<Map<string, string>> {
  if (iso3ToIso2Map) return iso3ToIso2Map;

  const response = await axios.get(config.apis.worldBankCountries);
  const countries = response.data[1] as Array<{ id: string; iso2Code: string }>;
  
  iso3ToIso2Map = new Map();
  for (const c of countries) {
    if (c.id && c.iso2Code && c.iso2Code.length === 2) {
      iso3ToIso2Map.set(c.id, c.iso2Code);
    }
  }
  
  return iso3ToIso2Map;
}

// Sleep helper for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch ALL historical data for a World Bank indicator (all pages)
 */
export async function fetchWorldBankIndicatorHistory(
  indicatorCode: string,
  perPage = 1000
): Promise<IndicatorRecord[]> {
  console.log(`[WorldBankHistory] Fetching all history for: ${indicatorCode}`);
  
  const iso3Map = await getIso3ToIso2Map();
  const allRecords: IndicatorRecord[] = [];
  
  let currentPage = 1;
  let totalPages = 1;
  
  do {
    const url = `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}?format=json&per_page=${perPage}&page=${currentPage}`;
    
    try {
      const response = await axios.get(url);
      
      const meta = response.data[0] as WorldBankMeta;
      const data = response.data[1] as WorldBankDataPoint[] | null;
      
      totalPages = meta.pages;
      
      if (currentPage === 1) {
        console.log(`[WorldBankHistory] Total records: ${meta.total}, Pages: ${totalPages}`);
      }
      
      if (data && Array.isArray(data)) {
        for (const point of data) {
          if (point.value === null) continue;
          
          const iso2 = iso3Map.get(point.countryiso3code);
          if (!iso2) continue;
          
          const year = parseInt(point.date, 10);
          if (isNaN(year)) continue;
          
          allRecords.push({
            countryCode: iso2,
            value: point.value,
            effectiveDate: `${year}-12-31`,
          });
        }
      }
      
      console.log(`[WorldBankHistory] Page ${currentPage}/${totalPages} - collected ${allRecords.length} records`);
      
      currentPage++;
      
      // Rate limiting: wait 500ms between requests
      if (currentPage <= totalPages) {
        await sleep(500);
      }
      
    } catch (err) {
      console.error(`[WorldBankHistory] Error fetching page ${currentPage}:`, err);
      throw err;
    }
    
  } while (currentPage <= totalPages);
  
  console.log(`[WorldBankHistory] Completed: ${allRecords.length} total records for ${indicatorCode}`);
  return allRecords;
}

/**
 * Bulk upsert historical records into the database
 * Uses batched inserts with ON CONFLICT handling
 */
export async function bulkUpsertHistoricalData(
  indicatorId: string,
  records: IndicatorRecord[],
  batchSize = 500
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        // Validate country code
        if (!/^[A-Z]{2}$/.test(record.countryCode)) {
          skipped++;
          continue;
        }
        
        // Check if country exists
        const countryCheck = await client.query(
          'SELECT 1 FROM countries WHERE country_code = $1',
          [record.countryCode]
        );
        if (countryCheck.rowCount === 0) {
          skipped++;
          continue;
        }
        
        // Check for existing record with same value
        const existing = await client.query(
          `SELECT value FROM indicator_values 
           WHERE country_code = $1 AND indicator_id = $2 AND effective_date = $3
           ORDER BY data_version DESC LIMIT 1`,
          [record.countryCode, indicatorId, record.effectiveDate]
        );
        
        if (existing.rowCount && existing.rowCount > 0) {
          // If same value, skip
          if (Math.abs(existing.rows[0].value - record.value) < 0.0001) {
            skipped++;
            continue;
          }
          // Different value - would insert new version, but for backfill we skip
          skipped++;
          continue;
        }
        
        // Insert new record
        await client.query(
          `INSERT INTO indicator_values 
           (country_code, indicator_id, effective_date, value, fetched_at, data_version)
           VALUES ($1, $2, $3, $4, NOW(), 1)
           ON CONFLICT (country_code, indicator_id, effective_date, data_version) DO NOTHING`,
          [record.countryCode, indicatorId, record.effectiveDate, record.value]
        );
        inserted++;
      }
      
      console.log(`[WorldBankHistory] Batch ${Math.floor(i / batchSize) + 1}: inserted=${inserted}, skipped=${skipped}`);
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  
  return { inserted, skipped };
}

/**
 * Main function to backfill historical data for a single indicator
 */
export async function backfillIndicatorHistory(
  indicatorType: string,
  indicatorId: string,
  worldBankCode: string
): Promise<void> {
  console.log(`\n[Backfill] Starting: ${indicatorType} (${worldBankCode})`);
  
  try {
    const records = await fetchWorldBankIndicatorHistory(worldBankCode);
    const result = await bulkUpsertHistoricalData(indicatorId, records);
    
    console.log(`[Backfill] Completed ${indicatorType}: inserted=${result.inserted}, skipped=${result.skipped}`);
  } catch (err) {
    console.error(`[Backfill] Failed ${indicatorType}:`, err);
    throw err;
  }
}

