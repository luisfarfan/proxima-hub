import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthTokenStorage, BusinessContextService } from '@luisfarfan/auth';
import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { HubDataCacheService } from '../../../core/services/hub-data-cache.service';
import { NgTemplateOutlet } from '@angular/common';
import { QuotaLabelPipe } from '../../../shared/pipes/quota-label.pipe';
import { resolveActiveBusinessName } from '../../../core/auth/active-business-name';
import { shortPlanName } from '../../../core/billing/plan-name';

/**
 * El color propio de cada app, y sólo en el chip del icono.
 *
 * PROXIMA es un sistema de un acento (#0009dc). Tres tarjetas con el MISMO
 * cuadrado azul no se distinguían entre sí: el azul dejaba de significar
 * «acción» y pasaba a ser decoración de app. Teñir el chip —y nada más que el
 * chip— devuelve identidad sin repintar la página: el fondo sigue siendo papel,
 * el texto sigue siendo tinta y el azul de marca sigue siendo el botón.
 *
 * Los tres derivados comparten luminosidad y croma en OKLCH y sólo cambian de
 * tono, así ninguno pesa más que otro.
 */
const APP_TINT: Record<string, string> = {
  panel: '#0009dc',
  caja: 'oklch(0.52 0.13 205)',
  tienda: 'oklch(0.53 0.15 28)',
  intelligence: 'oklch(0.52 0.15 300)',
  app: 'oklch(0.52 0.12 155)',
};

/** El readiness ya dice si el sitio está publicado; no hace falta preguntarlo aparte. */
const WEBSITE_READINESS_ID = 'storefront.website';

/** Tono de la línea de estado de una app. */
export type AppStatusTone = 'ok' | 'warn';

export interface AppStatus {
  text: string;
  tone: AppStatusTone;
}

// entitlement key for each add-on app (matches businessCtx.entitlements())
const ADD_ON_FEATURE_KEY: Record<string, string> = {
  tienda: 'cms',
  intelligence: 'pricing_intelligence',
};

/**
 * Add-ons que se compran sueltos, espejo de `ADDON_LADDER` del API.
 * Una feature que NO aparece acá y tampoco en ningún plan del catálogo no se
 * puede anunciar con precio — y entonces no se inventa uno.
 */
const ADD_ON_CATALOG: Record<string, { name: string; monthlyPrice: number; minPlan?: string }> = {
  cms: { name: 'Tienda Web', monthlyPrice: 50, minPlan: 'emprende' },
  pricing_intelligence: { name: 'Intelligence', monthlyPrice: 100 },
};

/** Cómo se abre una app bloqueada: comprando un add-on, o subiendo de plan. */
interface UnlockPath {
  kind: 'addon' | 'plan' | 'unknown';
  /** Línea que explica qué hay que hacer. */
  detail: string;
  /** Monto grande de la derecha. */
  amount: string;
  /** Renglón bajo el monto. */
  amountNote: string;
}

// Two independent gates per app (mirrors how big apps separate billing from RBAC):
//   - entitlement: does the BUSINESS pay for it? (plan) → upsell when missing.
//   - anyPerm: does the USER's role allow it? → "sin acceso" when missing (no upsell).
interface AppGate {
  entitlement?: string;        // plan feature key (businessCtx.entitlements())
  anyPerm?: string[];          // user needs ANY of these permission codes
}
const APP_GATES: Record<string, AppGate> = {
  panel: { anyPerm: ['catalog:manage', 'orders:view', 'orders:manage', 'inventory:manage', 'fulfillment:manage', 'cms:read', 'users:manage'] },
  caja: { entitlement: 'pos', anyPerm: ['pos:operate', 'pos:manage'] },
  tienda: { entitlement: 'cms' },
  intelligence: { entitlement: 'pricing_intelligence' },
  app: {},
};

// ---------------------------------------------------------------------------
// Local types (mirrors admin models; kept lean for the hub)
// ---------------------------------------------------------------------------

interface UsageSummary {
  resource: string;
  limit: number;
  current: number;
  unit: string;
}

interface SubscriptionStatus {
  plan_name: string;
  status: string;
  usage: UsageSummary[];
}

interface HubAppUnlock {
  unlock?: UnlockPath;
}

interface ReadinessItem {
  id: string;
  complete: boolean;
  skipped: boolean;
  blocking: boolean;
  cta_label: string;
  status?: string;
}

interface ReadinessSection {
  items: ReadinessItem[];
}

interface BusinessStatus {
  readiness: {
    sections: ReadinessSection[];
    progress: { completed: number; total: number; percentage: number };
  };
}

export interface HubApp {
  key: string;
  name: string;
  desc: string;
  icon: 'panel' | 'caja' | 'tienda' | 'intelligence' | 'app';
  url: string;
  /** Plan add-on the business hasn't enabled → upsell. */
  addOn: boolean;
  /** User's role lacks the permission → "sin acceso" (NOT an upsell). */
  noAccess: boolean;
}

// Static fallback used while CORS is not yet enabled (Fase 8)
const FALLBACK_CHECKLIST: ReadinessItem[] = [
  { id: 'biz', complete: true, skipped: false, blocking: false, cta_label: 'Crea tu negocio' },
  { id: 'products', complete: false, skipped: false, blocking: false, cta_label: 'Sube tus primeros productos' },
  { id: 'payments', complete: false, skipped: false, blocking: false, cta_label: 'Configura tus métodos de pago' },
  { id: 'store', complete: false, skipped: false, blocking: false, cta_label: 'Personaliza tu tienda' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [QuotaLabelPipe, RouterLink, NgTemplateOutlet],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly tokens = inject(AuthTokenStorage);
  private readonly businessCtx = inject(BusinessContextService);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly router = inject(Router);
  private readonly hubData = inject(HubDataCacheService);

  // --- User / business (needed for hero section) ---
  protected readonly user = this.auth.user;
  protected readonly memberships = this.auth.memberships;

  protected readonly firstName = computed(() => {
    const n = this.user()?.full_name;
    return n ? n.split(' ')[0] : 'tú';
  });

  protected readonly activeBusinessName = computed(() => {
    const bizId = this.businessCtx.businessId();
    return resolveActiveBusinessName(this.memberships(), this.user(), bizId);
  });

  // Effective permission codes the user holds in the ACTIVE business.
  // Served by GET /me → active_business.permissions (not yet in the auth lib's
  // public type, so read defensively); '*' = super admin.
  // Returns null when the field is ABSENT (older API that predates this) so the
  // permission gate can fail OPEN — never lock a user out because the backend
  // didn't ship the field yet. An empty array means "user genuinely has none".
  private readonly userPermissions = computed((): ReadonlySet<string> | null => {
    const ab = this.user()?.active_business as { permissions?: string[] } | null | undefined;
    return ab?.permissions ? new Set(ab.permissions) : null;
  });

  /**
   * PPR-112 — el centro del Hub era idéntico para el dueño y para un empleado.
   *
   * Un miembro con rol Sales (`orders:*`) veía "Termina de configurar" con las
   * tareas del NEGOCIO —nombre de tienda, logo, contacto, WhatsApp, métodos de
   * pago, facturación, guías de despacho— y la tarjeta "Tu plan" con el plan
   * contratado, los asientos y el almacenamiento. Ninguna tarea era suya y
   * ninguna podía hacer: todas esas pantallas lo mandan a /forbidden.
   *
   * El dato ya estaba: el mismo `userPermissions` que decide qué aplicaciones
   * ofrecer. El checklist y el plan simplemente no pasaban por ese filtro.
   *
   * `settings:manage` es el permiso de quien administra el negocio, que es de
   * quien son esas tareas. Falla ABIERTO cuando la API no manda permisos, igual
   * que el gate de aplicaciones: nunca esconder por un campo que no llegó.
   */
  protected readonly canManageBusiness = computed(() => {
    const perms = this.userPermissions();
    if (perms === null) return true;
    // '*' es el comodín del super admin — el mismo que `hasAnyPerm` ya respeta
    // acá abajo. Sin esta línea, a quien puede todo se le escondía el checklist
    // y la tarjeta de plan: la API le manda ['*'], no la lista de códigos.
    return perms.has('*') || perms.has('settings:manage');
  });

  // --- App switcher ---
  private readonly plansRes = resource({
    loader: async () => this.hubData.getPlans(),
  });

  /** Del más barato al más caro: el primero que incluye una feature es el que hay que nombrar. */
  private readonly plansByPrice = computed(() =>
    [...(this.plansRes.value() ?? [])].sort((a, b) => a.monthly_price - b.monthly_price),
  );

  /**
   * Qué abre una app bloqueada. Primero se pregunta si algún plan la incluye
   * —«Caja» sale recién en Lidera, no es un add-on— y solo si ninguno lo hace
   * se la trata como compra suelta.
   */
  /** Expuesto a la plantilla: el saludo y la tarjeta de plan no quieren la cola. */
  protected shortPlanName(name: string): string {
    return shortPlanName(name);
  }

  protected unlockFor(entitlement: string | undefined): UnlockPath {
    if (!entitlement) return { kind: 'unknown', detail: '', amount: '', amountNote: '' };

    const plan = this.plansByPrice().find((p) => p.features?.[entitlement] === true);
    if (plan) {
      const label = shortPlanName(plan.name);
      return {
        kind: 'plan',
        detail: `Viene incluida desde el plan ${label} — no se compra suelta`,
        amount: label,
        amountNote: `S/ ${plan.monthly_price} al mes`,
      };
    }

    const addon = ADD_ON_CATALOG[entitlement];
    if (addon) {
      const floorPlan = addon.minPlan
        ? this.plansByPrice().find((p) => p.id === addon.minPlan)
        : undefined;
      const floor = floorPlan ? shortPlanName(floorPlan.name) : addon.minPlan ?? null;
      return {
        kind: 'addon',
        detail: floor
          ? `Add-on de S/ ${addon.monthlyPrice} al mes · necesita al menos el plan ${floor}`
          : `Add-on de S/ ${addon.monthlyPrice} al mes · lo activamos contigo`,
        amount: `+ S/ ${addon.monthlyPrice}`,
        amountNote: 'al mes',
      };
    }

    // Sin plan que la incluya y sin add-on conocido: se dice lo que se sabe.
    return { kind: 'unknown', detail: 'Todavía no está disponible en tu cuenta', amount: '', amountNote: '' };
  }

  /** Lo que el comercio ya puede abrir. */
  protected readonly ownedApps = computed(() => this.apps().filter((a) => !a.addOn));

  /** Lo que está detrás de un plan o un add-on. */
  protected readonly lockedApps = computed(() =>
    this.apps()
      .filter((a) => a.addOn)
      .map((app) => ({ ...app, unlock: this.unlockFor(APP_GATES[app.key]?.entitlement) })),
  );

  protected readonly apps = computed((): HubApp[] => {
    const e = this.businessCtx.entitlements();
    const has = (key: string) => !!e?.[key];
    const perms = this.userPermissions();
    const hasAnyPerm = (codes?: string[]) =>
      // Unknown permissions (null) or no requirement → don't gate (fail-open).
      perms === null || !codes?.length || perms.has('*') || codes.some((c) => perms.has(c));

    const build = (app: Omit<HubApp, 'addOn' | 'noAccess'>): HubApp => {
      const gate = APP_GATES[app.key] ?? {};
      // Plan gate first: an un-entitled business is an upsell, regardless of role.
      const addOn = !!gate.entitlement && !has(gate.entitlement);
      // Permission gate only matters once the business is entitled.
      const noAccess = !addOn && !hasAnyPerm(gate.anyPerm);
      return { ...app, addOn, noAccess };
    };

    const candidates: Array<HubApp | null> = [
      build({ key: 'panel', name: 'Panel', desc: 'Tu escritorio: catálogo, pedidos, stock y clientes', icon: 'panel', url: this.runtimeConfig.adminUrl() ?? '' }),
      build({ key: 'caja', name: 'Caja', desc: 'Punto de venta: cobra en mostrador y emite boleta', icon: 'caja', url: this.runtimeConfig.posUrl() ?? '' }),
      this.runtimeConfig.builderUrl()
        ? build({ key: 'tienda', name: 'Tienda Web', desc: 'Arrastra bloques, arma tu tienda y publícala', icon: 'tienda', url: this.runtimeConfig.builderUrl()! })
        : null,
      this.runtimeConfig.intelligenceUrl()
        ? build({ key: 'intelligence', name: 'Intelligence', desc: 'Precios sugeridos y márgenes con IA', icon: 'intelligence', url: this.runtimeConfig.intelligenceUrl()! })
        : null,
      this.runtimeConfig.mobileUrl()
        ? build({ key: 'app', name: 'App', desc: 'Tu negocio en el celular', icon: 'app', url: this.runtimeConfig.mobileUrl()! })
        : null,
    ];

    return candidates.filter((a): a is HubApp => a !== null && !!a.url);
  });

  // --- Subscription / plan card ---
  // Uses HubDataCacheService (TTL 5 min) to avoid re-fetching on every mount.
  private readonly billingRes = resource({
    loader: async () => this.hubData.getSubscriptionStatus(this.businessCtx.businessId()),
  });

  protected readonly subscription = computed(() => this.billingRes.value() ?? null);
  protected readonly subscriptionLoading = this.billingRes.isLoading;

  protected readonly usageItems = computed(
    () => (this.subscription()?.usage ?? []).slice(0, 2),
  );

  protected usagePct(item: UsageSummary): number {
    // limit <= 0 es «sin tope» (-1) o «sin dato» (0): en ninguno de los dos
    // casos hay una fracción que dibujar, y -1 daba una barra de -400%.
    if (item.limit <= 0) return 0;
    return Math.min(100, Math.round((item.current / item.limit) * 100));
  }

  // --- Business status / onboarding checklist ---
  private readonly statusRes = resource({
    loader: async () => this.hubData.getBusinessStatus(this.businessCtx.businessId()),
  });

  protected readonly statusLoading = this.statusRes.isLoading;

  protected readonly checklistItems = computed((): ReadinessItem[] => {
    const status = this.statusRes.value();
    if (!status) return FALLBACK_CHECKLIST;
    return status.readiness.sections
      .flatMap((s) => s.items)
      .filter((it) => it.status !== 'obsoleted');
  });

  /** El paso que toca ahora: el primero sin completar. */
  protected readonly nextStep = computed(
    () => this.checklistItems().find((item) => !item.complete) ?? null,
  );

  protected readonly restSteps = computed(() => {
    const next = this.nextStep();
    return this.checklistItems().filter((item) => item !== next);
  });

  /**
   * Un comercio sin productos no puede «salir en vivo»: el catálogo vacío es
   * lo primero. Mientras ese paso siga pendiente, la tarjeta del plan invita a
   * comparar, no a publicar algo que no existe.
   */
  protected readonly canGoLive = computed(() => {
    const catalog = this.checklistItems().find((item) => item.id === 'catalog.has_products');
    return catalog ? catalog.complete : true;
  });

  protected readonly doneCount = computed(() => {
    const progress = this.statusRes.value()?.readiness.progress;
    if (progress) return progress.completed;
    return FALLBACK_CHECKLIST.filter((i) => i.complete).length;
  });

  protected readonly totalCount = computed(() => {
    const progress = this.statusRes.value()?.readiness.progress;
    if (progress) return progress.total;
    return FALLBACK_CHECKLIST.length;
  });

  protected readonly progressPct = computed(() => {
    const progress = this.statusRes.value()?.readiness.progress;
    if (progress) return progress.percentage;
    const total = this.totalCount();
    return total ? Math.round((this.doneCount() / total) * 100) : 0;
  });

  // --- Señales de cada app ---------------------------------------------
  /**
   * No bloquea nada: la home se pinta entera sin esto y los números aparecen
   * cuando llegan. Un launcher que espera a un contador para dejarte entrar a
   * tu negocio es peor launcher que uno sin contador.
   */
  private readonly signalsRes = resource({
    loader: async () => this.hubData.getAppSignals(this.businessCtx.businessId()),
  });

  private readonly moneyFormat = computed(() => {
    const ab = this.user()?.active_business as { currency_code?: string } | null | undefined;
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: ab?.currency_code || 'PEN',
      maximumFractionDigits: 0,
    });
  });

  /**
   * Los números de Panel. Se omite el que no se pudo traer en vez de mostrar
   * un cero: `null` es «no se sabe», y un empleado sin `fulfillment:manage`
   * recibe 403, no un catálogo vacío.
   */
  protected readonly panelStats = computed(() => {
    const s = this.signalsRes.value();
    if (!s) return [];
    const out: Array<{ key: string; value: string; label: string; alert: boolean }> = [];
    if (s.pendingOrders !== null) {
      out.push({
        key: 'pending',
        value: String(s.pendingOrders),
        label: s.pendingOrders === 1 ? 'pedido sin atender' : 'pedidos sin atender',
        alert: s.pendingOrders > 0,
      });
    }
    if (s.depletedVariants !== null && s.depletedVariants > 0) {
      // Cero agotados no es noticia: ocupa un mosaico para no decir nada.
      out.push({
        key: 'depleted',
        value: String(s.depletedVariants),
        label: s.depletedVariants === 1 ? 'producto agotado' : 'productos agotados',
        alert: true,
      });
    }
    if (s.revenueToday !== null) {
      out.push({
        key: 'revenue',
        value: this.moneyFormat().format(s.revenueToday),
        label: 'vendido hoy',
        alert: false,
      });
    }
    return out;
  });

  /** La app que se abre todos los días manda; el resto va en la grilla. */
  protected readonly flagshipApp = computed(
    () => this.ownedApps().find((a) => a.key === 'panel') ?? this.ownedApps()[0] ?? null,
  );

  protected readonly secondaryApps = computed(() => {
    const lead = this.flagshipApp();
    return this.ownedApps().filter((a) => a !== lead);
  });

  protected tintFor(app: HubApp): string {
    return APP_TINT[app.key] ?? 'var(--accent)';
  }

  /**
   * Por qué abrir esta app AHORA. Sólo se dice lo que se sabe de verdad: hoy
   * eso es el estado de la tienda, que viene en el readiness que ya se pide.
   * Caja no tiene línea porque el módulo POS no expone ninguna agregación —
   * inventarle «caja abierta» sería adivinar.
   */
  protected statusFor(app: HubApp): AppStatus | null {
    if (app.noAccess) return null;

    if (app.key === 'tienda') {
      const item = this.checklistItems().find((i) => i.id === WEBSITE_READINESS_ID);
      if (!item) return null;
      return item.complete
        ? { text: 'Publicada y en línea', tone: 'ok' }
        : { text: 'Sin publicar', tone: 'warn' };
    }

    if (app.key === 'caja') {
      const s = this.signalsRes.value();
      if (!s || s.posOpenSessions === null) return null;
      if (s.posOpenSessions > 0) {
        const cobrado = s.posRevenueToday !== null
          ? ` · ${this.moneyFormat().format(s.posRevenueToday)} hoy`
          : '';
        return { text: `Turno abierto${cobrado}`, tone: 'ok' };
      }
      return { text: 'Sin turno abierto', tone: 'warn' };
    }

    return null;
  }

  /**
   * El API manda -1 por «sin tope» y la tarjeta lo imprimía tal cual:
   * «Almacenamiento 0 / -1». Un límite negativo no es un límite.
   */
  protected quotaLimit(item: UsageSummary): string {
    return item.limit < 0 ? 'Ilimitado' : String(item.limit);
  }

  protected isUnlimited(item: UsageSummary): boolean {
    return item.limit < 0;
  }

  // --- Actions ---
  protected openApp(app: HubApp): void {
    if (app.noAccess) {
      // Permission gate: upgrading the plan won't help — it's an internal role.
      // Big apps surface "ask your admin" here, never a billing CTA.
      return;
    }
    if (app.addOn) {
      // Hub is the single billing destination — route to /plan with feature context.
      const featureKey = ADD_ON_FEATURE_KEY[app.key] ?? app.key;
      this.router.navigate(['/plan'], { queryParams: { feature: featureKey } });
      return;
    }
    if (app.key === 'app') {
      window.open(app.url, '_blank', 'noopener,noreferrer');
      return;
    }
    // SSO handoff: pass tokens + business so the target app gets a valid session
    // without needing a hub round-trip (which would end in a loop since the user
    // is already authenticated and guestGuard would just redirect to hub home).
    const access = this.tokens.getAccessToken();
    const refresh = this.tokens.getRefreshToken();
    const businessId = this.businessCtx.businessId();
    const params = new URLSearchParams();
    if (businessId) params.set('sso_business', businessId);
    if (access) params.set('sso', access);
    if (refresh) params.set('sso_refresh', refresh);
    const qs = params.toString();
    window.location.href = qs ? `${app.url}?${qs}` : app.url;
  }
}
