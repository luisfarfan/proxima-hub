import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { SKIP_GLOBAL_LOADER, SUPPRESS_ERROR_TOAST } from '@luisfarfan/auth';
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

/**
 * Lo que cada app tiene que decir para justificar que la abras.
 *
 * `null` no es cero: es «no se pudo saber». Un empleado de mostrador no tiene
 * `fulfillment:manage` y la API le responde 403 — mostrarle «0 pedidos» sería
 * mentirle. La tarjeta se pinta sin la línea y ya.
 *
 * Sólo viven acá las señales que EXISTEN y no cuestan un add-on:
 *   - `pendingOrders`  → GET admin/fulfillment/stats  (una agregación GROUP BY)
 *   - `revenueToday`   → GET admin/sales-summary?days=1 (una agregación, con
 *                        índice ix_orders_business_created detrás)
 *
 * Quedaron fuera a propósito, y no por diseño sino porque el dato no está:
 *   - «vendido en caja hoy»: el módulo POS no tiene ni una sola agregación.
 *   - «productos agotados»: `depleted_count` de admin/inventory/alerts se
 *     calcula sobre la PÁGINA devuelta, no sobre el total, así que pedir
 *     `size=1` —lo que uno haría para no traer 50 filas al pedo— devuelve 0.
 *   - si la tienda está publicada NO se pide acá: ya viene en el readiness
 *     (`storefront.website`) que el Hub pide igual.
 */
export interface HubAppSignals {
  pendingOrders: number | null;
  revenueToday: number | null;
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
  private signalsCache: (CacheEntry<HubAppSignals> & { bizId: string }) | null = null;

  /**
   * Estas dos no son de arranque: la home se pinta sin ellas y se rellenan
   * cuando llegan. Van en paralelo y sin barrera —un 403 en una no puede
   * llevarse la otra— y silenciadas: son de fondo, no las pidió nadie, así que
   * no merecen ni toast ni la barra de carga global.
   */
  private static readonly QUIET = {
    context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true).set(SKIP_GLOBAL_LOADER, true),
  };

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

  async getAppSignals(businessId: string | null): Promise<HubAppSignals> {
    const unknown: HubAppSignals = { pendingOrders: null, revenueToday: null };
    if (!businessId) return unknown;
    if (this.signalsCache?.bizId === businessId && !isStale(this.signalsCache)) {
      return this.signalsCache.value;
    }

    const [orders, sales] = await Promise.allSettled([
      firstValueFrom(
        this.http.get<{ pending_count: number }>('admin/fulfillment/stats', HubDataCacheService.QUIET),
      ),
      firstValueFrom(
        this.http.get<{ revenue: number }>('admin/sales-summary', {
          ...HubDataCacheService.QUIET,
          params: { days: 1 },
        }),
      ),
    ]);

    const value: HubAppSignals = {
      pendingOrders:
        orders.status === 'fulfilled' && typeof orders.value?.pending_count === 'number'
          ? orders.value.pending_count
          : null,
      revenueToday:
        sales.status === 'fulfilled' && typeof sales.value?.revenue === 'number'
          ? sales.value.revenue
          : null,
    };
    this.signalsCache = { value, ts: Date.now(), bizId: businessId };
    return value;
  }

  invalidate(): void {
    this.subscriptionCache = null;
    this.statusCache = null;
    this.plansCache = null;
    this.signalsCache = null;
  }
}
