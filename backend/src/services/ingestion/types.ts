export interface IndicatorRecord {
  countryCode: string;
  value: number;
  effectiveDate: string; // ISO date string YYYY-MM-DD
}

export interface IngestionResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface IngestionJob {
  name: string;
  indicatorId: string;
  run: () => Promise<IndicatorRecord[]>;
}

