import { pool } from '../../db/pool.js';
import { IndicatorRecord, IngestionResult } from './types.js';

// Validate a single record
function validateRecord(record: IndicatorRecord): string | null {
  if (!record.countryCode || !/^[A-Z]{2}$/.test(record.countryCode)) {
    return `Invalid country_code: ${record.countryCode}`;
  }
  if (typeof record.value !== 'number' || !Number.isFinite(record.value)) {
    return `Invalid value for ${record.countryCode}: ${record.value}`;
  }
  if (!record.effectiveDate || !/^\d{4}-\d{2}-\d{2}$/.test(record.effectiveDate)) {
    return `Invalid effective_date for ${record.countryCode}: ${record.effectiveDate}`;
  }
  return null;
}

export async function upsertIndicatorValues(
  indicatorId: string,
  records: IndicatorRecord[],
  fetchedAt: Date
): Promise<IngestionResult> {
  const result: IngestionResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    for (const record of records) {
      // Validate
      const validationError = validateRecord(record);
      if (validationError) {
        result.errors.push(validationError);
        continue;
      }

      // Check if country exists
      const countryCheck = await client.query(
        'SELECT 1 FROM countries WHERE country_code = $1',
        [record.countryCode]
      );
      if (countryCheck.rowCount === 0) {
        result.skipped++;
        continue; // Skip countries we don't have in our DB
      }

      // Check for existing value with same effective_date
      const existing = await client.query(
        `SELECT id, value, data_version
         FROM indicator_values
         WHERE country_code = $1 AND indicator_id = $2 AND effective_date = $3
         ORDER BY data_version DESC
         LIMIT 1`,
        [record.countryCode, indicatorId, record.effectiveDate]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        const existingValue = existing.rows[0].value;
        const existingVersion = existing.rows[0].data_version;

        // If value is the same, skip (dedupe)
        if (Math.abs(existingValue - record.value) < 0.0001) {
          result.skipped++;
          continue;
        }

        // Value differs - insert new version
        await client.query(
          `INSERT INTO indicator_values 
           (country_code, indicator_id, effective_date, value, fetched_at, data_version)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            record.countryCode,
            indicatorId,
            record.effectiveDate,
            record.value,
            fetchedAt,
            existingVersion + 1,
          ]
        );
        result.updated++;
      } else {
        // No existing record - insert new
        await client.query(
          `INSERT INTO indicator_values 
           (country_code, indicator_id, effective_date, value, fetched_at, data_version)
           VALUES ($1, $2, $3, $4, $5, 1)`,
          [record.countryCode, indicatorId, record.effectiveDate, record.value, fetchedAt]
        );
        result.inserted++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return result;
}

// Log ingestion run
export async function logIngestion(
  jobName: string,
  status: 'success' | 'failure' | 'partial',
  startedAt: Date,
  result: IngestionResult,
  errorMessage?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO ingestion_logs 
     (job_name, status, started_at, finished_at, items_inserted, items_updated, error_message)
     VALUES ($1, $2, $3, NOW(), $4, $5, $6)`,
    [
      jobName,
      status,
      startedAt,
      result.inserted,
      result.updated,
      errorMessage || null,
    ]
  );
}

