export type RuleSetDTO = {
  id: string;
  unitPriceCents: number;
  unitWeightKg: number;
  shipRatePerKgKm: number;
  shippingMaxRatio: number;
  tiers: Array<{ threshold: number; pct: number; priority: number }>;
};

export interface RulesProvider {
  getActive(now: Date): Promise<RuleSetDTO | null>;
  invalidate(): void;
}
