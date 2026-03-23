/**
 * Term codes used for class schedule filtering in scenario demand + day parking plan.
 * Shared so parking occupancy assign and user arrival logic stay aligned (no circular imports).
 */
export const DEFAULT_ARRIVAL_PLAN_TERM_CODE = "2026/WI";

export function normalizeArrivalTermCode(s: string): string {
  return s.trim().toUpperCase();
}

export function getArrivalPlanTermCodes(): string[] {
  const multi = process.env.ARRIVAL_PLAN_TERM_CODES?.trim();
  if (multi) {
    return multi
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  const single = process.env.ARRIVAL_PLAN_TERM?.trim();
  if (single) return [single];
  return [DEFAULT_ARRIVAL_PLAN_TERM_CODE];
}
