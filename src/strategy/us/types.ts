import type { UniverseStock } from "../../types.js";

export interface UsTvStock extends UniverseStock {
  exchange: string;
  sector: string;
  price: number;
  evEbitda: number;
}

export interface UsMomentumData {
  code: string;
  name: string;
  exchange: string;
  currentPrice: number;
  price12mAgo: number;
  momentum12m: number;
  evEbitda: number;
}

export interface UsScoringData {
  momentumData: UsMomentumData[];
}
