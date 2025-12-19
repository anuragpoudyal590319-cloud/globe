import axios from 'axios';
import { pool } from '../db/pool.js';
import { config } from '../config.js';

// Country to currency mapping (common ones)
// Using a simplified map since country-to-currency package has issues
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD', GB: 'GBP', EU: 'EUR', JP: 'JPY', CN: 'CNY',
  AU: 'AUD', CA: 'CAD', CH: 'CHF', IN: 'INR', BR: 'BRL',
  RU: 'RUB', KR: 'KRW', MX: 'MXN', ZA: 'ZAR', SG: 'SGD',
  HK: 'HKD', NO: 'NOK', SE: 'SEK', DK: 'DKK', NZ: 'NZD',
  TH: 'THB', MY: 'MYR', ID: 'IDR', PH: 'PHP', PL: 'PLN',
  TR: 'TRY', IL: 'ILS', AE: 'AED', SA: 'SAR', EG: 'EGP',
  NG: 'NGN', KE: 'KES', GH: 'GHS', AR: 'ARS', CL: 'CLP',
  CO: 'COP', PE: 'PEN', VN: 'VND', PK: 'PKR', BD: 'BDT',
  UA: 'UAH', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
  HR: 'HRK', RS: 'RSD', IS: 'ISK', TW: 'TWD', // Taiwan
  AT: 'EUR', BE: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR',
  FR: 'EUR', DE: 'EUR', GR: 'EUR', IE: 'EUR', IT: 'EUR',
  LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', NL: 'EUR',
  PT: 'EUR', SK: 'EUR', SI: 'EUR', ES: 'EUR',
  // Add more as needed
};

interface WorldBankCountry {
  id: string;
  iso2Code: string;
  name: string;
  region: { value: string };
  incomeLevel: { value: string };
}

async function fetchWorldBankCountries(): Promise<WorldBankCountry[]> {
  console.log('[Seed] Fetching countries from World Bank API...');
  
  const response = await axios.get(config.apis.worldBankCountries);
  
  // World Bank returns [metadata, data] array
  const countries = response.data[1] as WorldBankCountry[];
  
  // Filter out aggregates (non-country entries)
  return countries.filter(c => 
    c.iso2Code && 
    c.iso2Code.length === 2 && 
    c.region?.value !== 'Aggregates' &&
    !c.id.startsWith('X') // Exclude regional codes
  );
}

async function seedCountries(): Promise<void> {
  try {
    const countries = await fetchWorldBankCountries();
    console.log(`[Seed] Found ${countries.length} countries to seed`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const country of countries) {
        const currencyCode = COUNTRY_CURRENCY_MAP[country.iso2Code] || null;
        
        await client.query(
          `INSERT INTO countries (country_code, name, region, income_level, currency_code, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (country_code) DO UPDATE SET
             name = EXCLUDED.name,
             region = EXCLUDED.region,
             income_level = EXCLUDED.income_level,
             currency_code = COALESCE(EXCLUDED.currency_code, countries.currency_code),
             updated_at = NOW()`,
          [
            country.iso2Code,
            country.name,
            country.region?.value || null,
            country.incomeLevel?.value || null,
            currencyCode,
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`[Seed] Successfully seeded ${countries.length} countries`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

// Run if executed directly
seedCountries()
  .then(() => {
    console.log('[Seed] Complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Seed] Failed:', err);
    process.exit(1);
  });

