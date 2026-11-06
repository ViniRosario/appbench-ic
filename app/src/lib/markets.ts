/**
 * Lojas (países) disponíveis para coleta. O idioma define em que língua vêm os textos dos apps —
 * e, portanto, em que língua os termos devem ser pesquisados. A API interpreta datas em pt/en/es.
 */
export interface Market {
  country: string;
  lang: string;
  label: string;
}

export const MARKETS: Market[] = [
  { country: 'br', lang: 'pt', label: 'Brasil' },
  { country: 'pt', lang: 'pt', label: 'Portugal' },
  { country: 'us', lang: 'en', label: 'Estados Unidos' },
  { country: 'gb', lang: 'en', label: 'Reino Unido' },
  { country: 'ca', lang: 'en', label: 'Canadá' },
  { country: 'au', lang: 'en', label: 'Austrália' },
  { country: 'in', lang: 'en', label: 'Índia' },
  { country: 'es', lang: 'es', label: 'Espanha' },
  { country: 'mx', lang: 'es', label: 'México' },
  { country: 'ar', lang: 'es', label: 'Argentina' },
  { country: 'co', lang: 'es', label: 'Colômbia' },
  { country: 'cl', lang: 'es', label: 'Chile' },
];

export const DEFAULT_MARKET = MARKETS[0] as Market;

export const marketLabel = (country: string): string =>
  MARKETS.find((m) => m.country === country)?.label ?? country.toUpperCase();
