import type { UsFundamentals } from "../types.js";

export interface FundamentalsProvider {
  get(symbols: string[]): Promise<UsFundamentals[]>;
}

// TODO: 구체적인 Provider 구현체 추가
// 예: Financial Modeling Prep, Yahoo Finance 등
