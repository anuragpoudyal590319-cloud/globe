import { useState, useCallback, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleSequential } from 'd3-scale';
import { Country, IndicatorValue, IndicatorType } from '../api/client';
import { Tooltip } from './Tooltip';
import { Legend } from './Legend';
import styles from './ChoroplethMap.module.css';

// Using Natural Earth TopoJSON with ISO codes
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Country name to ISO2 mapping for fallback (since world-atlas only has names)
const NAME_TO_ISO2: Record<string, string> = {
  'United States of America': 'US', 'United States': 'US', 'USA': 'US',
  'United Kingdom': 'GB', 'Great Britain': 'GB',
  'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES', 'Japan': 'JP',
  'China': 'CN', 'India': 'IN', 'Brazil': 'BR', 'Russia': 'RU', 'Canada': 'CA',
  'Australia': 'AU', 'Mexico': 'MX', 'South Korea': 'KR', 'Indonesia': 'ID',
  'Turkey': 'TR', 'Saudi Arabia': 'SA', 'Argentina': 'AR', 'South Africa': 'ZA',
  'Netherlands': 'NL', 'Switzerland': 'CH', 'Sweden': 'SE', 'Poland': 'PL',
  'Belgium': 'BE', 'Norway': 'NO', 'Austria': 'AT', 'Iran': 'IR', 'Thailand': 'TH',
  'United Arab Emirates': 'AE', 'Nigeria': 'NG', 'Israel': 'IL', 'Ireland': 'IE',
  'Malaysia': 'MY', 'Singapore': 'SG', 'Hong Kong': 'HK', 'Philippines': 'PH',
  'Denmark': 'DK', 'Finland': 'FI', 'Chile': 'CL', 'Colombia': 'CO', 'Pakistan': 'PK',
  'Egypt': 'EG', 'Czechia': 'CZ', 'Czech Republic': 'CZ', 'Portugal': 'PT', 'Greece': 'GR',
  'New Zealand': 'NZ', 'Peru': 'PE', 'Romania': 'RO', 'Vietnam': 'VN', 'Bangladesh': 'BD',
  'Ukraine': 'UA', 'Hungary': 'HU', 'Kuwait': 'KW', 'Qatar': 'QA', 'Morocco': 'MA',
  'Ecuador': 'EC', 'Kazakhstan': 'KZ', 'Algeria': 'DZ', 'Angola': 'AO', 'Ethiopia': 'ET',
  'Kenya': 'KE', 'Tanzania': 'TZ', 'Guatemala': 'GT', 'Dominican Rep.': 'DO',
  'Dominican Republic': 'DO', 'Uruguay': 'UY', 'Slovakia': 'SK', 'Bulgaria': 'BG',
  'Croatia': 'HR', 'Serbia': 'RS', 'Lithuania': 'LT', 'Slovenia': 'SI', 'Latvia': 'LV',
  'Estonia': 'EE', 'Cyprus': 'CY', 'Luxembourg': 'LU', 'Malta': 'MT', 'Iceland': 'IS',
  'Bahrain': 'BH', 'Oman': 'OM', 'Jordan': 'JO', 'Lebanon': 'LB', 'Sri Lanka': 'LK',
  'Myanmar': 'MM', 'Nepal': 'NP', 'Uzbekistan': 'UZ', 'Ghana': 'GH', 'Tunisia': 'TN',
  'Cameroon': 'CM', 'Ivory Coast': 'CI', "Côte d'Ivoire": 'CI', 'Senegal': 'SN',
  'Uganda': 'UG', 'Zambia': 'ZM', 'Zimbabwe': 'ZW', 'Bolivia': 'BO', 'Paraguay': 'PY',
  'Honduras': 'HN', 'El Salvador': 'SV', 'Nicaragua': 'NI', 'Costa Rica': 'CR',
  'Panama': 'PA', 'Jamaica': 'JM', 'Trinidad and Tobago': 'TT', 'Bahamas': 'BS',
  'Mongolia': 'MN', 'Laos': 'LA', 'Cambodia': 'KH', 'Brunei': 'BN', 'Taiwan': 'TW',
  'Fiji': 'FJ', 'Papua New Guinea': 'PG', 'Cuba': 'CU', 'Haiti': 'HT', 'Venezuela': 'VE',
  'Iraq': 'IQ', 'Syria': 'SY', 'Yemen': 'YE', 'Afghanistan': 'AF', 'Turkmenistan': 'TM',
  'Tajikistan': 'TJ', 'Kyrgyzstan': 'KG', 'Azerbaijan': 'AZ', 'Georgia': 'GE',
  'Armenia': 'AM', 'Belarus': 'BY', 'Moldova': 'MD', 'Albania': 'AL', 'Macedonia': 'MK',
  'North Macedonia': 'MK', 'Montenegro': 'ME', 'Kosovo': 'XK', 'Bosnia and Herz.': 'BA',
  'Bosnia and Herzegovina': 'BA', 'Dem. Rep. Congo': 'CD', 'Congo': 'CG',
  'Central African Rep.': 'CF', 'Central African Republic': 'CF', 'Sudan': 'SD',
  'S. Sudan': 'SS', 'South Sudan': 'SS', 'Libya': 'LY', 'Chad': 'TD', 'Niger': 'NE',
  'Mali': 'ML', 'Burkina Faso': 'BF', 'Mauritania': 'MR', 'Benin': 'BJ', 'Togo': 'TG',
  'Guinea': 'GN', 'Sierra Leone': 'SL', 'Liberia': 'LR', 'Gabon': 'GA',
  'Eq. Guinea': 'GQ', 'Equatorial Guinea': 'GQ', 'Namibia': 'NA', 'Botswana': 'BW',
  'Mozambique': 'MZ', 'Madagascar': 'MG', 'Malawi': 'MW', 'Rwanda': 'RW', 'Burundi': 'BI',
  'Eritrea': 'ER', 'Djibouti': 'DJ', 'Somalia': 'SO', 'Somaliland': 'SO',
  'W. Sahara': 'EH', 'Western Sahara': 'EH', 'Greenland': 'GL', 'Puerto Rico': 'PR',
  'North Korea': 'KP', 'Dem. Rep. Korea': 'KP',
};

interface ChoroplethMapProps {
  countries: Country[];
  indicatorValues: IndicatorValue[];
  indicatorType: IndicatorType;
  isLoading: boolean;
  onCountryClick?: (countryCode: string) => void;
}

// Color interpolators for different indicator types
function getColorInterpolator(type: IndicatorType) {
  switch (type) {
    case 'exchange':
      // Blue to purple gradient for exchange rates
      return (t: number) => {
        const r = Math.round(59 + (167 - 59) * t);
        const g = Math.round(130 + (139 - 130) * t);
        const b = Math.round(246 + (250 - 246) * t);
        return `rgb(${r}, ${g}, ${b})`;
      };
    case 'interest':
      // Teal to amber gradient for interest rates
      return (t: number) => {
        const r = Math.round(20 + (245 - 20) * t);
        const g = Math.round(184 + (158 - 184) * t);
        const b = Math.round(166 + (11 - 166) * t);
        return `rgb(${r}, ${g}, ${b})`;
      };
    case 'inflation':
      // Green to red gradient for inflation (low is good)
      return (t: number) => {
        const r = Math.round(16 + (239 - 16) * t);
        const g = Math.round(185 + (68 - 185) * t);
        const b = Math.round(129 + (68 - 129) * t);
        return `rgb(${r}, ${g}, ${b})`;
      };
    case 'gdp_per_capita':
      // Dark red to bright green (wealth gradient)
      return (t: number) => {
        const r = Math.round(127 + (16 - 127) * t);
        const g = Math.round(29 + (185 - 29) * t);
        const b = Math.round(29 + (129 - 29) * t);
        return `rgb(${r}, ${g}, ${b})`;
      };
    case 'unemployment':
      // Green to red gradient (low unemployment is good)
      return (t: number) => {
        const r = Math.round(16 + (220 - 16) * t);
        const g = Math.round(185 + (38 - 185) * t);
        const b = Math.round(129 + (38 - 129) * t);
        return `rgb(${r}, ${g}, ${b})`;
      };
    case 'government_debt':
      // Light blue to deep red (low debt is better)
      return (t: number) => {
        const r = Math.round(56 + (185 - 56) * t);
        const g = Math.round(189 + (28 - 189) * t);
        const b = Math.round(248 + (28 - 248) * t);
        return `rgb(${r}, ${g}, ${b})`;
      };
    case 'gini':
      // Green to orange/red (low inequality is good)
      return (t: number) => {
        const r = Math.round(74 + (234 - 74) * t);
        const g = Math.round(222 + (88 - 222) * t);
        const b = Math.round(128 + (12 - 128) * t);
        return `rgb(${r}, ${g}, ${b})`;
      };
    case 'life_expectancy':
      // Red to green (higher life expectancy is better)
      return (t: number) => {
        const r = Math.round(239 + (16 - 239) * t);
        const g = Math.round(68 + (185 - 68) * t);
        const b = Math.round(68 + (129 - 68) * t);
        return `rgb(${r}, ${g}, ${b})`;
      };
    default:
      // Default blue gradient
      return (t: number) => {
        const r = Math.round(59 + (99 - 59) * t);
        const g = Math.round(130 + (102 - 130) * t);
        const b = Math.round(246 + (241 - 246) * t);
        return `rgb(${r}, ${g}, ${b})`;
      };
  }
}

// ISO3 to ISO2 mapping for common countries (Natural Earth uses ISO_A3)
const ISO3_TO_ISO2: Record<string, string> = {
  USA: 'US', GBR: 'GB', FRA: 'FR', DEU: 'DE', ITA: 'IT', ESP: 'ES', JPN: 'JP',
  CHN: 'CN', IND: 'IN', BRA: 'BR', RUS: 'RU', CAN: 'CA', AUS: 'AU', MEX: 'MX',
  KOR: 'KR', IDN: 'ID', TUR: 'TR', SAU: 'SA', ARG: 'AR', ZAF: 'ZA', NLD: 'NL',
  CHE: 'CH', SWE: 'SE', POL: 'PL', BEL: 'BE', NOR: 'NO', AUT: 'AT', IRN: 'IR',
  THA: 'TH', ARE: 'AE', NGA: 'NG', ISR: 'IL', IRL: 'IE', MYS: 'MY', SGP: 'SG',
  HKG: 'HK', PHL: 'PH', DNK: 'DK', FIN: 'FI', CHL: 'CL', COL: 'CO', PAK: 'PK',
  EGY: 'EG', CZE: 'CZ', PRT: 'PT', GRC: 'GR', NZL: 'NZ', PER: 'PE', ROU: 'RO',
  VNM: 'VN', BGD: 'BD', UKR: 'UA', HUN: 'HU', KWT: 'KW', QAT: 'QA', MAR: 'MA',
  PRI: 'PR', ECU: 'EC', KAZ: 'KZ', DZA: 'DZ', AGO: 'AO', ETH: 'ET', KEN: 'KE',
  TZA: 'TZ', GTM: 'GT', DOM: 'DO', URY: 'UY', SVK: 'SK', BGR: 'BG', HRV: 'HR',
  SRB: 'RS', LTU: 'LT', SVN: 'SI', LVA: 'LV', EST: 'EE', CYP: 'CY', LUX: 'LU',
  MLT: 'MT', ISL: 'IS', BHR: 'BH', OMN: 'OM', JOR: 'JO', LBN: 'LB', LKA: 'LK',
  MMR: 'MM', NPL: 'NP', UZB: 'UZ', GHA: 'GH', TUN: 'TN', CMR: 'CM', CIV: 'CI',
  SEN: 'SN', UGA: 'UG', ZMB: 'ZM', ZWE: 'ZW', BOL: 'BO', PRY: 'PY', HND: 'HN',
  SLV: 'SV', NIC: 'NI', CRI: 'CR', PAN: 'PA', JAM: 'JM', TTO: 'TT', BHS: 'BS',
  MNG: 'MN', LAO: 'LA', KHM: 'KH', BRN: 'BN', TWN: 'TW', MAC: 'MO',
};

export function ChoroplethMap({ 
  countries, 
  indicatorValues, 
  indicatorType,
  isLoading,
  onCountryClick,
}: ChoroplethMapProps) {
  const [tooltipData, setTooltipData] = useState<{
    country: Country | null;
    value: IndicatorValue | null;
    position: { x: number; y: number };
    visible: boolean;
  }>({
    country: null,
    value: null,
    position: { x: 0, y: 0 },
    visible: false,
  });

  // Build lookup maps
  const countryMap = useMemo(() => {
    const map = new Map<string, Country>();
    countries.forEach(c => map.set(c.country_code, c));
    return map;
  }, [countries]);

  const valueMap = useMemo(() => {
    const map = new Map<string, IndicatorValue>();
    indicatorValues.forEach(v => map.set(v.country_code, v));
    return map;
  }, [indicatorValues]);

  // Calculate domain and color scale
  const { domain, colorScale } = useMemo(() => {
    const values = indicatorValues.map(v => v.value).filter(v => Number.isFinite(v));
    if (values.length === 0) {
      return { 
        domain: [0, 100] as [number, number], 
        colorScale: scaleSequential(getColorInterpolator(indicatorType)).domain([0, 100])
      };
    }
    
    // Use percentiles for better distribution (exclude extreme outliers)
    const sorted = [...values].sort((a, b) => a - b);
    const p5 = sorted[Math.floor(sorted.length * 0.05)] ?? sorted[0];
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
    
    const min = Math.min(p5, 0);
    const max = Math.max(p95, p5 + 1);
    
    return {
      domain: [min, max] as [number, number],
      colorScale: scaleSequential(getColorInterpolator(indicatorType)).domain([min, max])
    };
  }, [indicatorValues, indicatorType]);

  const handleMouseEnter = useCallback((
    geo: { properties: { ISO_A2?: string; ISO_A3?: string; name?: string; NAME?: string } },
    event: React.MouseEvent
  ) => {
    // Try ISO_A2 first, then ISO_A3, then name mapping
    let iso2 = geo.properties.ISO_A2;
    if (!iso2 || iso2 === '-99') {
      const iso3 = geo.properties.ISO_A3;
      if (iso3) {
        iso2 = ISO3_TO_ISO2[iso3];
      }
    }
    if (!iso2) {
      const name = geo.properties.name || geo.properties.NAME;
      if (name) {
        iso2 = NAME_TO_ISO2[name];
      }
    }
    
    if (!iso2) return;
    
    const country = countryMap.get(iso2);
    const value = valueMap.get(iso2);
    
    setTooltipData({
      country: country || { country_code: iso2, name: geo.properties.name || iso2, region: null, income_level: null, currency_code: null },
      value: value || null,
      position: { x: event.clientX, y: event.clientY },
      visible: true,
    });
  }, [countryMap, valueMap]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltipData(prev => ({
      ...prev,
      position: { x: event.clientX, y: event.clientY },
    }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipData(prev => ({ ...prev, visible: false }));
  }, []);

  const handleClick = useCallback((geo: { properties: { ISO_A2?: string; ISO_A3?: string; name?: string; NAME?: string } }) => {
    if (!onCountryClick) return;
    
    let iso2 = geo.properties.ISO_A2;
    if (!iso2 || iso2 === '-99') {
      const iso3 = geo.properties.ISO_A3;
      if (iso3) {
        iso2 = ISO3_TO_ISO2[iso3];
      }
    }
    if (!iso2) {
      const name = geo.properties.name || geo.properties.NAME;
      if (name) {
        iso2 = NAME_TO_ISO2[name];
      }
    }
    
    if (iso2) {
      onCountryClick(iso2);
    }
  }, [onCountryClick]);

  const getCountryColor = useCallback((geo: { properties: { ISO_A2?: string; ISO_A3?: string; name?: string; NAME?: string } }) => {
    let iso2 = geo.properties.ISO_A2;
    if (!iso2 || iso2 === '-99') {
      const iso3 = geo.properties.ISO_A3;
      if (iso3) {
        iso2 = ISO3_TO_ISO2[iso3];
      }
    }
    if (!iso2) {
      const name = geo.properties.name || geo.properties.NAME;
      if (name) {
        iso2 = NAME_TO_ISO2[name];
      }
    }
    
    if (!iso2) return '#1e293b';
    
    const value = valueMap.get(iso2);
    if (!value) return '#1e293b'; // No data color
    
    return colorScale(Math.max(domain[0], Math.min(domain[1], value.value)));
  }, [valueMap, colorScale, domain]);

  return (
    <div className={styles.container}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span>Loading data...</span>
        </div>
      )}
      
      <div className={styles.mapWrapper}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 130,
            center: [10, 20],
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getCountryColor(geo)}
                    stroke="#0f172a"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none', cursor: onCountryClick ? 'pointer' : 'default' },
                      hover: { outline: 'none', filter: 'brightness(1.2)', cursor: onCountryClick ? 'pointer' : 'default' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e) => handleMouseEnter(geo, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(geo)}
                  />
                ))
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      <div className={styles.legendWrapper}>
        <Legend 
          indicatorType={indicatorType}
          domain={domain}
          colorScale={colorScale}
        />
      </div>

      <Tooltip
        country={tooltipData.country}
        value={tooltipData.value}
        indicatorType={indicatorType}
        position={tooltipData.position}
        visible={tooltipData.visible}
      />
    </div>
  );
}

