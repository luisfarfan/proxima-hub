import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  value: T;
  ts: number;
}

function isStale<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return true;
  return Date.now() - entry.ts > TTL_MS;
}

export interface SubscriptionStatus {
  plan_name: string;
  status: string;
  usage: Array<{ resource: string; limit: number; current: number; unit: string }>;
}

export interface PlanSummary {
  id: string;
  name: string;
  monthly_price: number;
  features?: Record<string, boolean>;
}

export interface BusinessStatus {
  readiness: {
    sections: Array<{ items: Array<{ id: string; complete: boolean; skipped: boolean; blocking: boolean; cta_label: string; status?: string }> }>;
    progress: { completed: number; total: number; percentage: number };
  };
}

@Injectable({ providedIn: 'root' })
export class HubDataCacheService {
  private readonly http = inject(HttpClient);

  private subscriptionCache: (CacheEntry<SubscriptionStatus | null> & { bizId: string }) | null = null;
  private statusCache: (CacheEntry<BusinessStatus | null> & { bizId: string }) | null = null;
  private plansCache: CacheEntry<PlanSummary[]> | null = null;

  async getSubscriptionStatus(businessId: string | null): Promise<SubscriptionStatus | null> {
    if (!businessId) return null;
    if (this.subscriptionCache?.bizId === businessId && !isStale(this.subscriptionCache)) {
      return this.subscriptionCache.value;
    }
    try {
      const value = await firstValueFrom(
        this.http.get<SubscriptionStatus>('admin/billing/subscription/status'),
      );
      this.subscriptionCache = { value, ts: Date.now(), bizId: businessId };
      return value;
    } catch {
      this.subscriptionCache = { value: null, ts: Date.now(), bizId: businessId };
      return null;
    }
  }

  async getBusinessStatus(businessId: string | null): Promise<BusinessStatus | null> {
    if (!businessId) return null;
    if (this.statusCache?.bizId === businessId && !isStale(this.statusCache)) {
      return this.statusCache.value;
    }
    try {
      const value = await firstValueFrom(
        this.http.get<BusinessStatus>('admin/business/status'),
      );
      this.statusCache = { value, ts: Date.now(), bizId: businessId };
      return value;
    } catch {
      this.statusCache = { value: null, ts: Date.now(), bizId: businessId };
      return null;
    }
  }

  /**
   * Catálogo de planes. El Hub lo necesita para decir QUÉ abre cada app
   * bloqueada: sin esto solo puede decir «no lo tienes», que es justo lo que
   * hacía que las tarjetas parecieran todas iguales.
   */
  async getPlans(): Promise<PlanSummary[]> {
    if (this.plansCache && !isStale(this.plansCache)) return this.plansCache.value;
    try {
      const value = await firstValueFrom(this.http.get<PlanSummary[]>('billing/plans'));
      this.plansCache = { value: value ?? [], ts: Date.now() };
      return this.plansCache.value;
    } catch {
      this.plansCache = { value: [], ts: Date.now() };
      return [];
    }
  }

  invalidate(): void {
    this.subscriptionCache = null;
    this.statusCache = null;
    this.plansCache = null;
  }
}
