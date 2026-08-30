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
 * Todo viene de UNA llamada: `GET admin/hub/summary`. Antes esto eran dos —y el
 * diseño pedía cuatro—, cada una con su permiso y por lo tanto con su propio
 * 403 que el launcher tenía que saber interpretar. El endpoint agrega del lado
 * del servidor, cachea por negocio y responde 200 con lo que este usuario puede
 * ver.
 *
 * `null` no es cero: es «no se sabe». Un cajero sin `fulfillment:manage` recibe
 * el campo en null, no un 0 que le diría que no hay trabajo. La tarjeta se pinta
 * sin esa línea.
 */
export interface HubAppSignals {
  pendingOrders: number | null;
  revenueToday: number | null;
  depletedVariants: number | null;
  posOpenSessions: number | null;
  posRevenueToday: number | null;
}

interface HubSummaryPayload {
  pending_orders: number | null;
  revenue_today: number | null;
  orders_today: number | null;
  depleted_variants: number | null;
  pos_open_sessions: number | null;
  pos_revenue_today: number | null;
}

/**
 * Ficha por comercio para «elegir comercio».
 *
 * Sale de `GET platform/businesses/summary`, que la API ya servía para la
 * consola de operadores: consultas en lote (nunca una por comercio) y caché
 * Redis de 5 min. Va detrás de `platform:read`, así que sólo la ve quien opera
 * la plataforma — un comerciante con dos negocios recibe 403 y la pantalla cae
 * a la lista de siempre.
 */
export interface MerchantSummary {
  id: string;
  plan_name: string | null;
  has_website: boolean;
  website_domain: string | null;
  website_published: boolean;
  order_count_30d: number;
  revenue_30d: number;
  created_at: string | null;
  is_active: boolean;
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
  private merchantsCache: CacheEntry<Map<string, MerchantSummary>> | null = null;

  /**
   * Estas dos no son de arranque: la home se pinta sin ellas y se rellenan
   * cuando llegan. Van en paralelo y sin barrera —un 403 en una no puede
   * llevarse la otra— y silenciadas: son de fondo, no las pidió nadie, así que
   * no merecen ni toast ni la barra de carga global.
   */
  private static readonly QUIET = {
    context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true).set(SKIP_GLOBAL_LOADER, true),
  };

  private static readonly SIN_SENALES: HubAppSignals = {
    pendingOrders: null,
    revenueToday: null,
    depletedVariants: null,
    posOpenSessions: null,
    posRevenueToday: null,
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
    if (!businessId) return HubDataCacheService.SIN_SENALES;
    if (this.signalsCache?.bizId === businessId && !isStale(this.signalsCache)) {
      return this.signalsCache.value;
    }

    let value = HubDataCacheService.SIN_SENALES;
    try {
      const raw = await firstValueFrom(
        this.http.get<HubSummaryPayload>('admin/hub/summary', HubDataCacheService.QUIET),
      );
      value = {
        pendingOrders: raw?.pending_orders ?? null,
        revenueToday: raw?.revenue_today ?? null,
        depletedVariants: raw?.depleted_variants ?? null,
        posOpenSessions: raw?.pos_open_sessions ?? null,
        posRevenueToday: raw?.pos_revenue_today ?? null,
      };
    } catch {
      // Sin señales el Hub sigue siendo un launcher: se entra igual a las apps.
    }
    this.signalsCache = { value, ts: Date.now(), bizId: businessId };
    return value;
  }

  /**
   * Devuelve un índice por id, no una lista: quien la pide ya tiene sus
   * comercios y sólo quiere enriquecerlos. Un mapa vacío significa «sin ficha»
   * —403, red caída, o el endpoint no disponible— y la pantalla se dibuja igual.
   */
  async getMerchantSummaries(): Promise<Map<string, MerchantSummary>> {
    if (this.merchantsCache && !isStale(this.merchantsCache)) return this.merchantsCache.value;
    const index = new Map<string, MerchantSummary>();
    try {
      const res = await firstValueFrom(
        this.http.get<{ items: MerchantSummary[] }>('platform/businesses/summary', {
          ...HubDataCacheService.QUIET,
          params: { size: 100 },
        }),
      );
      for (const item of res?.items ?? []) index.set(item.id, item);
    } catch {
      // Sin permiso de plataforma no hay ficha, y no hay nada que avisar.
    }
    this.merchantsCache = { value: index, ts: Date.now() };
    return index;
  }

  invalidate(): void {
    this.subscriptionCache = null;
    this.statusCache = null;
    this.plansCache = null;
    this.signalsCache = null;
    this.merchantsCache = null;
  }
}
