import type { UniverseStock } from "../../types.js";

export interface UsStock extends UniverseStock {
  exchange: string;
  sector: string;
  price: number;
  dollarVolume: number;
}

export interface UsFundamentals {
  symbol: string;
  asOfDate: string;
  ebitdaTtm: number | null;
  totalDebt: number | null;
  cashAndEquivalents: number | null;
  sector?: string;
}

export interface UsEvEbitdaData {
  code: string;
  name: string;
  marketCap: number;
  totalDebt: number;
  cash: number;
  ebitda: number;
  enterpriseValue: number;
  evEbitda: number;
}

export interface UsScoringData {
  evEbitdaData: UsEvEbitdaData[];
}
