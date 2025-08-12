import type { RulesProvider, RuleSetDTO } from '../domain/provider';
import { loadActiveRuleSet } from '../infra/prisma.provider';

export class CachedRulesProvider implements RulesProvider {
  private cache: { value: RuleSetDTO | null; at: number } | null = null;
  private readonly ttlMs: number;
  constructor(ttlMs = 60_000) {
    this.ttlMs = ttlMs;
  }

  invalidate() {
    this.cache = null;
  }

  async getActive(now: Date): Promise<RuleSetDTO | null> {
    const nowMs = now.getTime();
    if (this.cache && nowMs - this.cache.at < this.ttlMs) return this.cache.value;
    const value = await loadActiveRuleSet(now);
    this.cache = { value, at: nowMs };
    return value;
  }
}
