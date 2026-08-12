import { hasRebalancedThisQuarter } from "../storage/repository.js";

export async function alreadyRebalanced(quarter: string): Promise<boolean> {
  return hasRebalancedThisQuarter(quarter);
}
