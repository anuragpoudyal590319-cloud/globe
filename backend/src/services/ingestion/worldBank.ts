import axios from 'axios';
import { config } from '../../config.js';
import { IndicatorRecord } from './types.js';

interface WorldBankDataPoint {
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  indicator: { id: string; value: string };
}

interface WorldBankResponse {
  page: number;
  pages: number;
  per_page: number;
  total: number;
}

// Mapping of ISO3 to ISO2 codes (World Bank uses ISO3 in countryiso3code)
// We'll build this from the country API response
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

export async function fetchWorldBankIndicator(
  indicatorCode: string
): Promise<IndicatorRecord[]> {
  console.log(`[WorldBank] Fetching indicator: ${indicatorCode}`);
  
  const url = config.apis.worldBankIndicator(indicatorCode);
  const response = await axios.get(url);
  
  // World Bank returns [metadata, data] or [metadata, null] if no data
  const metadata = response.data[0] as WorldBankResponse;
  const data = response.data[1] as WorldBankDataPoint[] | null;
  
  if (!data || !Array.isArray(data)) {
    console.log(`[WorldBank] No data returned for ${indicatorCode}`);
    return [];
  }

  console.log(`[WorldBank] Received ${data.length} data points (page 1/${metadata.pages})`);
  
  // Get ISO mapping
  const iso3Map = await getIso3ToIso2Map();
  
  // Map to best value per country (mrnev=1 should give us most recent, but let's be safe)
  const countryBest = new Map<string, IndicatorRecord>();
  
  for (const point of data) {
    if (point.value === null) continue;
    
    // Get ISO2 code
    const iso2 = iso3Map.get(point.countryiso3code);
    if (!iso2) continue;
    
    // Parse year to date (World Bank usually returns year as "2023")
    const year = parseInt(point.date, 10);
    if (isNaN(year)) continue;
    
    const effectiveDate = `${year}-12-31`; // Use end of year as effective date
    
    const existing = countryBest.get(iso2);
    if (!existing || existing.effectiveDate < effectiveDate) {
      countryBest.set(iso2, {
        countryCode: iso2,
        value: point.value,
        effectiveDate,
      });
    }
  }

  const records = Array.from(countryBest.values());
  console.log(`[WorldBank] Processed ${records.length} unique country records for ${indicatorCode}`);
  
  return records;
}

// Original indicators
export async function fetchInterestRates(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.interest);
}

export async function fetchInflationRates(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.inflation);
}

// New indicators
export async function fetchGdpPerCapita(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.gdp_per_capita);
}

export async function fetchUnemploymentRate(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.unemployment);
}

export async function fetchGovernmentDebt(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.government_debt);
}

export async function fetchGiniIndex(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.gini);
}

export async function fetchLifeExpectancy(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.life_expectancy);
}

// Trade indicators
export async function fetchExports(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.exports);
}

export async function fetchImports(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.imports);
}

export async function fetchFdiInflows(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.fdi_inflows);
}

// Labor indicators
export async function fetchLaborForce(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.labor_force);
}

export async function fetchFemaleEmployment(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.female_employment);
}

// Finance indicators
export async function fetchDomesticCredit(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.domestic_credit);
}

// Development indicators
export async function fetchEducationSpending(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.education_spending);
}

export async function fetchPovertyHeadcount(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.poverty_headcount);
}

// Energy indicators
export async function fetchCo2Emissions(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.co2_emissions);
}

export async function fetchRenewableEnergy(): Promise<IndicatorRecord[]> {
  return fetchWorldBankIndicator(config.worldBankCodes.renewable_energy);
}
