import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BusinessContextService } from '@luisfarfan/auth';
import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { QuotaLabelPipe } from '../../../shared/pipes/quota-label.pipe';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  description?: string;
  /** `PlanRead.features` del API: clave canónica → si el plan la incluye. */
  features?: Record<string, boolean>;
  /** `PlanRead.quotas` del API: clave canónica → tope numérico (-1 = ilimitado). */
  quotas?: Record<string, number>;
}

/**
 * Etiquetas en español de las features canónicas. Espejo de `FEATURE_LABELS_ES`
 * del API, que hoy no las expone por HTTP: `PlanRead.features` viaja como
 * `{clave: bool}`. Mismo trato que `QuotaLabelPipe` le da a las cuotas.
 */
/**
 * `PlanRead.name` viene como «Emprende — Catálogo, pedidos y control de stock»:
 * sirve para un listado, no para un peldaño de 190 px.
 */
function planLabel(plan: { name: string }): string {
  return plan.name.split('—')[0].trim() || plan.name;
}

/** `launch_posture: assisted_only` en el packaging del API: no se contratan solos. */
const ASSISTED_PLAN_IDS = ['despega', 'lidera'];

const FEATURE_LABELS_ES: Record<string, string> = {
  catalog: 'Catálogo de productos',
  whatsapp_checkout: 'Pedidos por WhatsApp',
  analytics: 'Analítica de tus ventas',
  stock: 'Control de stock',
  manual_sales: 'Ventas manuales',
  orders: 'Gestión de pedidos',
  crm: 'CRM de clientes',
  electronic_invoicing: 'Facturación electrónica SUNAT',
  mostrador: 'Venta de mostrador',
  inventory: 'Inventario',
  warehouses: 'Almacenes',
  fulfillment: 'Despacho y envíos (GRE)',
  pos: 'Punto de venta (POS)',
  pricing_intelligence: 'Inteligencia de precios',
  product_reenrichment: 'Re-enriquecimiento de productos con IA',
  cms: 'Sitio web y CMS',
  cart: 'Carrito web',
};

/** Una cuota que sube al cambiar de plan: `10 → 500`. */
interface QuotaJump {
  key: string;
  /** Ausente cuando el plan vigente ni siquiera declara esa cuota. */
  from: number | undefined;
  to: number;
}

interface PlanCard {
  plan: Plan;
  isCurrent: boolean;
  isDowngrade: boolean;
  /** Solo lo que el plan actual NO tiene, calculado contra sus `features`. */
  gains: string[];
  quotaJumps: QuotaJump[];
  includes: string[];
}

interface UsageSummary {
  resource: string;
  limit: number;
  current: number;
}

interface SubscriptionStatus {
  plan_id?: string;
  plan_name: string;
  status: string;
  current_period_end?: string;
  usage: UsageSummary[];
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  currency?: string;
  status: string;
  method?: string;
}

interface AddonDef {
  key: string;
  name: string;
  description: string;
  entitlementKey: string;
  /** Qué dice el botón. `tienda_web` no arranca un cobro, arranca un asistente. */
  cta: string;
  /** Precio mensual del add-on, para el total que ve el usuario antes de decidir. */
  monthlyPrice: number;
  /**
   * Plan mínimo que lo habilita, espejo de `ADDON_LADDER.min_plan` del API.
   * Hoy el piso solo lo aplica `provision_addon`: sin declararlo acá, el hub
   * ofrece un botón que el backend va a rechazar y el usuario se entera tarde.
   */
  minPlan?: string;
}

const ADDON_DEFS: AddonDef[] = [
  {
    key: 'tienda_web',
    name: 'Tienda Web',
    description: 'Tu sitio con carrito, checkout y subdominio propio',
    entitlementKey: 'cms',
    cta: 'Crear mi tienda',
    monthlyPrice: 50,
    minPlan: 'emprende',
  },
  {
    key: 'precios_inteligentes',
    name: 'Intelligence',
    description: 'Precios y decisiones con IA',
    entitlementKey: 'pricing_intelligence',
    cta: 'Contratar',
    monthlyPrice: 100,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-plan-page',
  standalone: true,
  imports: [QuotaLabelPipe, DatePipe, LowerCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="page-root">
  <h1 class="page-h1">Plan</h1>

  <!-- Flash message (post MercadoPago return).
       aria-live wrapper must always be in the DOM so SR picks up content injected via @if. -->
  <div aria-live="assertive" aria-atomic="true">
    @if (flashMessage(); as msg) {
      <div class="alert" [class.alert-success]="msg.type === 'success'" [class.alert-error]="msg.type === 'error'" role="alert">
        {{ msg.text }}
      </div>
    }
  </div>

  <!-- ── Lo que dice tu uso ───────────────────────────────────────────── -->
  @if (usageRows().length > 0) {
    <section class="usage-strip" [class.has-alert]="usageAlerts().length > 0" aria-labelledby="usage-h">
      <div class="usage-strip-lead">
        <span class="usage-eyebrow" id="usage-h">Lo que dice tu uso</span>
        @if (usageAlerts().length > 0) {
          <p class="usage-claim">
            @for (row of usageAlerts(); track row.key; let last = $last) {
              @if (row.remaining === 0) {
                Llegaste al tope de <b>{{ row.key | quotaLabel | lowercase }}</b>
              } @else {
                Te {{ row.remaining === 1 ? 'queda' : 'quedan' }} <b>{{ row.remaining }} de {{ row.limit }}</b> en {{ row.key | quotaLabel | lowercase }}
              }
              @if (!last) { · }
            }
          </p>
          @if (suggestedPlan(); as plan) {
            <p class="usage-suggestion">El plan <b>{{ planTitle(plan) }}</b> es el más barato que lo resuelve.</p>
          } @else {
            <p class="usage-suggestion">Ningún plan superior sube esas cuotas, así que no te proponemos ninguno.</p>
          }
        } @else {
          <p class="usage-claim">Vas holgado en todas tus cuotas.</p>
        }
      </div>

      <div class="usage-meters">
        @for (row of usageRows(); track row.key) {
          <div class="usage-meter">
            <div class="usage-meter-head">
              <span>{{ row.key | quotaLabel }}</span>
              <b>{{ row.current }} / {{ row.limit }}</b>
            </div>
            <div
              class="usage-meter-bar"
              role="progressbar"
              [attr.aria-valuenow]="row.pct"
              aria-valuemin="0"
              aria-valuemax="100"
              [attr.aria-label]="(row.key | quotaLabel) + ': ' + row.current + ' de ' + row.limit"
            >
              <span [class.is-alert]="row.alert" [style.width.%]="row.pct"></span>
            </div>
          </div>
        }
      </div>
    </section>
  }

  <!-- ── Confirmación de cancelación ─────────────────────────────────── -->
  @if (cancelConfirm()) {
    <section class="confirm-card" aria-labelledby="cancel-confirm-h">
      <h2 class="confirm-h" id="cancel-confirm-h">¿Cancelar suscripción?</h2>
      <p class="confirm-body">
        Conservarás acceso a todas las funciones de tu plan actual hasta el final del período pagado.
        @if (subscription()?.current_period_end; as end) {
          Tu acceso vence el <strong>{{ end | date:'d MMM yyyy' : undefined : 'es-PE' }}</strong>.
        }
        Después pasarás al plan gratuito.
      </p>
      @if (actionError()) {
        <p class="field-error" role="alert">{{ actionError() }}</p>
      }
      <div class="confirm-actions">
        <button class="btn-primary btn-danger" type="button" [disabled]="actionLoading()" (click)="doCancel()">
          {{ actionLoading() ? 'Cancelando…' : 'Sí, cancelar suscripción' }}
        </button>
        <button class="btn-outline" type="button" [disabled]="actionLoading()" (click)="cancelConfirm.set(false)">
          No, mantener mi plan
        </button>
      </div>
    </section>
  }

  <!-- ── La escalera ──────────────────────────────────────────────────── -->
  @if (!plansLoading() && ladder().length > 0) {
    <section aria-labelledby="ladder-h">
      <h2 class="ladder-h" id="ladder-h">Hasta dónde puede llegar tu negocio</h2>
      <p class="ladder-sub">
        {{ ladder().length }} peldaños. Cada uno agrega una cosa concreta — toca cualquiera
        para ver qué cambia desde donde estás hoy.
      </p>

      <ul class="ladder" role="list">
        @for (rung of ladder(); track rung.plan.id) {
          <li class="rung-slot" [style.height.px]="rung.height">
            <button
              type="button"
              class="rung"
              [class.is-now]="rung.isCurrent"
              [class.is-assisted]="rung.assisted"
              [class.is-on]="rung.plan.id === selectedStep()?.plan?.id"
              [attr.aria-pressed]="rung.plan.id === selectedStep()?.plan?.id"
              (click)="pickStep(rung.plan.id)"
            >
              @if (rung.isCurrent) {
                <span class="rung-flag">Estás aquí</span>
              } @else if (rung.assisted) {
                <span class="rung-flag is-mute">Asistido</span>
              }
              <span class="rung-name">{{ planTitle(rung.plan) }}</span>
              <span class="rung-price">
                @if (rung.plan.monthly_price === 0) { Gratis } @else { S/ {{ rung.plan.monthly_price }} }
              </span>
              <span class="rung-headline">{{ rung.headline }}</span>
            </button>
          </li>
        }
      </ul>
      <div class="ladder-ground" aria-hidden="true"></div>

      @if (selectedStep(); as step) {
        <div class="step-detail">
          <section class="page-card">
            <div class="card-head">
              <h3 class="card-h2">
                @if (step.isCurrent) {
                  Lo que ya tienes con {{ planTitle(step.plan) }}
                } @else {
                  De {{ planTitle(currentPlanName()) }} a {{ planTitle(step.plan) }}, ganas
                }
              </h3>
              <span class="step-delta">{{ stepDeltaLabel() }}</span>
            </div>

            <ul class="step-gains" role="list">
              @for (gain of stepGains(); track gain) {
                <li class="step-gain">
                  <span class="step-gain-ico" aria-hidden="true">
                    @if (step.isCurrent) {
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    } @else {
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    }
                  </span>
                  {{ gain }}
                </li>
              }
            </ul>

            @if (stepJumps().length > 0) {
              <ul class="step-jumps" role="list">
                @for (jump of stepJumps(); track jump.key) {
                  <li class="step-jump">
                    {{ jump.key | quotaLabel }}
                    <b>{{ quotaValue(jump.from) }}</b>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-label="sube a"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    <b>{{ quotaValue(jump.to) }}</b>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="page-card step-how">
            <h3 class="card-h2">Cómo se activa</h3>
            <p class="step-how-text">{{ stepHowText() }}</p>

            <div class="step-how-cta">
              @if (step.isCurrent) {
                @if (subscription(); as sub) {
                  @if (sub.status === 'cancelled' && sub.current_period_end) {
                    <p class="cancelled-note">
                      Cancelado. Tienes acceso hasta el
                      <strong>{{ sub.current_period_end | date:'d MMM yyyy' : undefined : 'es-PE' }}</strong>.
                    </p>
                  } @else if (step.plan.monthly_price > 0) {
                    <button class="btn-danger-sm" type="button" (click)="cancelConfirm.set(true)">
                      Cancelar suscripción
                    </button>
                  }
                }
              } @else if (step.assisted) {
                <a class="btn-primary step-cta" [href]="assistedContactHref()">Hablar con el equipo</a>
              } @else if (step.isBelow) {
                @if (downgradeConfirmId() === step.plan.id) {
                  <div class="inline-confirm">
                    <span class="inline-confirm-label">¿Confirmar?</span>
                    <button class="btn-danger-sm" type="button" [disabled]="actionLoading()" (click)="confirmDowngrade()">
                      {{ actionLoading() ? '…' : 'Sí' }}
                    </button>
                    <button class="btn-outline" type="button" (click)="downgradeConfirmId.set(null)">No</button>
                  </div>
                } @else {
                  <button class="btn-outline step-cta" type="button" (click)="downgradeConfirmId.set(step.plan.id)">
                    Bajar a {{ planTitle(step.plan) }}
                  </button>
                }
              } @else {
                <button class="btn-primary step-cta" type="button" [disabled]="upgrading()" (click)="upgrade(step.plan.id)">
                  Cambiar a {{ planTitle(step.plan) }}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              }
            </div>
          </section>
        </div>
      }

      @if (upgradeError()) {
        <p class="field-error" role="alert">{{ upgradeError() }}</p>
      }
      @if (downgradeError()) {
        <p class="field-error" role="alert">{{ downgradeError() }}</p>
      }
    </section>
  }

  <!-- ── Add-ons ───────────────────────────────────────────────────────── -->
  @if (addonCards().length > 0) {
    <section class="page-card" aria-labelledby="addons-h">
      <div class="card-head">
        <h2 class="card-h2" id="addons-h">Add-ons</h2>
        <span class="plans-hint">Se suman a tu plan</span>
      </div>

      <ul class="addon-cards" role="list">
        @for (card of addonCards(); track card.key) {
          <li class="addon-card" role="listitem" [class.is-locked]="card.locked">
            <span class="addon-card-main">
              <span class="addon-card-name">
                {{ card.def.name }}
                <span class="addon-card-price">· S/ {{ card.def.monthlyPrice }} / mes</span>
              </span>
              <span class="addon-card-desc">{{ card.def.description }}</span>
            </span>

            @if (card.active) {
              <span class="addon-active-badge">Activo</span>
              <button class="btn-danger-sm" type="button"
                      [disabled]="addonLoading() === card.key"
                      (click)="cancelAddon(card.key)">
                {{ addonLoading() === card.key ? 'Cancelando…' : 'Cancelar' }}
              </button>
            } @else if (card.locked) {
              <span class="addon-lock">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                Necesita el plan {{ card.minPlanLabel }} o superior
              </span>
            } @else {
              <button class="btn-outline" type="button"
                      [disabled]="addonLoading() === card.key"
                      (click)="contractAddon(card.key)">
                {{ addonLoading() === card.key ? '…' : card.def.cta }}
              </button>
            }
          </li>
        }
      </ul>

      @if (addonError()) {
        <p class="field-error" role="alert">{{ addonError() }}</p>
      }

      <div class="total-bar">
        <span class="total-breakdown">{{ totalBreakdown() }}</span>
        <span class="total-amount">
          <span>Tu total mensual</span>
          <b>S/ {{ monthlyTotal() }}</b>
        </span>
      </div>
    </section>
  }

  <!-- ── Historial de pagos ────────────────────────────────────────────── -->
  @if (!paymentsLoading() && payments().length > 0) {
    <section class="page-card" aria-labelledby="payments-h">
      <h2 class="card-h2" id="payments-h">Historial de pagos</h2>
      <table class="payments-table" aria-label="Historial de pagos">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Monto</th>
            <th scope="col">Estado</th>
            <th scope="col">Método</th>
          </tr>
        </thead>
        <tbody>
          @for (p of payments(); track p.id) {
            <tr>
              <td>{{ p.date | date:'d MMM yyyy' : undefined : 'es-PE' }}</td>
              <td>{{ paymentAmount(p) }}</td>
              <td>
                <span class="payment-status"
                      [class.paid]="p.status === 'paid'"
                      [class.pending]="p.status === 'pending'"
                      [class.failed]="p.status === 'failed'">
                  {{ paymentStatusLabel(p.status) }}
                </span>
              </td>
              <td>{{ p.method ?? '—' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  }
</div>
  `,
  styleUrl: './plan-page.component.css',
})
export class PlanPageComponent {
  private readonly http = inject(HttpClient);
  private readonly businessCtx = inject(BusinessContextService);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly queryParams = toSignal(this.route.queryParamMap);

  // ---------------------------------------------------------------------------
  // Flash message (after MercadoPago return)
  // ---------------------------------------------------------------------------

  protected readonly flashMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  constructor() {
    effect(() => {
      const status = this.queryParams()?.get('status');
      if (status !== 'success' && status !== 'failure') return;
      untracked(() => {
        if (status === 'success') {
          this.flashMessage.set({ type: 'success', text: 'Tu plan ha sido actualizado correctamente.' });
          this.subRes.reload();
        } else {
          this.flashMessage.set({ type: 'error', text: 'El pago no se completó. Puedes intentarlo de nuevo.' });
        }
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { status: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  private readonly subRes = resource({
    loader: async () => {
      if (!this.businessCtx.businessId()) return null;
      try {
        return await firstValueFrom(
          this.http.get<SubscriptionStatus>('admin/billing/subscription/status'),
        );
      } catch {
        return null;
      }
    },
  });

  protected readonly subscription = computed(() => this.subRes.value() ?? null);
  protected readonly subLoading = this.subRes.isLoading;

  // ---------------------------------------------------------------------------
  // Plans catalog
  // ---------------------------------------------------------------------------

  private readonly plansRes = resource({
    loader: async () => {
      try {
        return await firstValueFrom(this.http.get<Plan[]>('billing/plans'));
      } catch {
        return [];
      }
    },
  });

  /** Del más barato al más caro: el orden en que se decide subir. */
  protected readonly plans = computed(() =>
    [...(this.plansRes.value() ?? [])].sort((a, b) => a.monthly_price - b.monthly_price),
  );
  protected readonly plansLoading = this.plansRes.isLoading;

  // ---------------------------------------------------------------------------
  // Deep-link: ?plan=<id> or ?feature=<key>
  // ---------------------------------------------------------------------------

  protected readonly targetPlanId = computed(() => {
    const params = this.queryParams();
    const directId = params?.get('plan') ?? null;
    if (directId) return directId;

    const feature = params?.get('feature') ?? null;
    if (!feature) return null;

    const sorted = [...this.plans()].sort((a, b) => a.monthly_price - b.monthly_price);
    return sorted.find((p) => p.features?.[feature] === true)?.id ?? null;
  });

  // ---------------------------------------------------------------------------
  // Plan comparison helpers
  // ---------------------------------------------------------------------------

  private currentPlanObj = computed(() => {
    const sub = this.subscription();
    if (!sub) return null;
    return this.plans().find((p) =>
      sub.plan_id ? p.id === sub.plan_id : p.name.toLowerCase() === sub.plan_name.toLowerCase(),
    ) ?? null;
  });

  protected isCurrent(plan: Plan): boolean {
    const current = this.currentPlanObj();
    if (!current) return false;
    return plan.id === current.id;
  }

  /**
   * El argumento del cambio de plan, calculado — no escrito a mano.
   *
   * `gains` sale de restar las `features` del plan actual a las del candidato,
   * y `quotaJumps` de comparar sus `quotas`. Si mañana el API mueve una feature
   * de un plan a otro, esto se entera solo; una lista hardcodeada, no.
   */
  /**
   * El uso real, que es lo que de verdad motiva subir de plan. Una cuota se
   * marca en alerta desde el 80 %: es el punto en el que al comercio le quedan
   * días, no semanas, antes de chocar con el tope.
   */
  protected readonly usageRows = computed(() => {
    const usage = this.subscription()?.usage ?? [];
    return usage
      .filter((item) => item.limit > 0)
      .map((item) => {
        const pct = Math.min(100, Math.round((item.current / item.limit) * 100));
        return {
          key: item.resource,
          current: item.current,
          limit: item.limit,
          pct,
          alert: pct >= 80,
          remaining: Math.max(0, item.limit - item.current),
        };
      });
  });

  protected readonly usageAlerts = computed(() => this.usageRows().filter((row) => row.alert));

  /**
   * El plan más barato que resuelve TODO lo que está en alerta. Si ninguno lo
   * hace, no se sugiere nada — inventar una recomendación es peor que callar.
   */
  protected readonly suggestedPlanId = computed<string | null>(() => {
    const alerts = this.usageAlerts();
    if (alerts.length === 0) return null;

    const current = this.currentPlanObj();
    const currentPrice = current?.monthly_price ?? 0;

    const candidate = this.plans()
      .filter((plan) => plan.id !== current?.id && plan.monthly_price > currentPrice)
      .find((plan) =>
        alerts.every((row) => {
          const cap = plan.quotas?.[row.key];
          return cap === -1 || (typeof cap === 'number' && cap > row.limit);
        }),
      );

    return candidate?.id ?? null;
  });

  protected readonly suggestedPlan = computed(
    () => this.plans().find((plan) => plan.id === this.suggestedPlanId()) ?? null,
  );

  protected readonly planCards = computed<PlanCard[]>(() => {
    const current = this.currentPlanObj();
    const currentFeatures = current?.features ?? {};
    const currentQuotas = current?.quotas ?? {};

    return this.plans().map((plan) => {
      const isCurrent = current ? plan.id === current.id : false;
      const features = plan.features ?? {};

      const gains = isCurrent
        ? []
        : Object.keys(features)
            .filter((key) => features[key] === true && currentFeatures[key] !== true)
            .map((key) => FEATURE_LABELS_ES[key] ?? key);

      const includes = Object.keys(features)
        .filter((key) => features[key] === true)
        .map((key) => FEATURE_LABELS_ES[key] ?? key);

      const quotaJumps: QuotaJump[] = isCurrent
        ? []
        : Object.entries(plan.quotas ?? {})
            .filter(([key, to]) => {
              const from = currentQuotas[key];
              return typeof from === 'number' && typeof to === 'number' && to > from;
            })
            .map(([key, to]) => ({ key, from: currentQuotas[key], to }));

      return {
        plan,
        isCurrent,
        isDowngrade: this.isDowngrade(plan),
        gains,
        includes,
        quotaJumps,
      };
    });
  });

  /**
   * `PlanRead.name` viene como «Emprende — Catálogo, pedidos y control de
   * stock»: sirve para un listado, no para el título de una tarjeta de 300 px
   * —se comía cuatro líneas y repetía la palabra «Gratis» encima del precio—.
   * El API tiene `public_name` en su packaging pero no lo expone por HTTP, así
   * que el corte se hace acá, por el guión largo, y el resto queda de bajada.
   */
  /**
   * La escalera. `PLAN_LADDER` del API trae los cinco planes; los dos de arriba
   * son `assisted_only` y hoy esta pantalla no los mencionaba nunca, aunque son
   * la mitad del catálogo. Se muestran, con su borde punteado, porque un
   * comercio que evalúa necesita ver hasta dónde llega esto.
   */
  protected readonly ladder = computed(() => {
    const plans = this.plans();
    const current = this.currentPlanObj();
    const currentIdx = current ? plans.findIndex((p) => p.id === current.id) : 0;
    const maxPrice = plans.length ? plans[plans.length - 1].monthly_price : 1;

    return plans.map((plan, idx) => ({
      plan,
      idx,
      isCurrent: idx === currentIdx,
      isBelow: idx < currentIdx,
      /** Un plan sin precio público se activa con el equipo, no solo. */
      assisted: ASSISTED_PLAN_IDS.includes(plan.id),
      /** Altura del peldaño: proporcional al precio, con un piso legible. */
      height: 46 + Math.round((plan.monthly_price / (maxPrice || 1)) * 54),
      /** Lo primero que agrega respecto del peldaño anterior. */
      headline: this.stepHeadline(plans, idx),
    }));
  });

  protected readonly selectedPlanId = signal<string | null>(null);

  protected readonly selectedStep = computed(() => {
    const rungs = this.ladder();
    if (rungs.length === 0) return null;
    const chosen = rungs.find((r) => r.plan.id === this.selectedPlanId());
    // Sin elección previa, se abre en el peldaño siguiente al actual: es la
    // pregunta que trae a esta pantalla.
    const currentIdx = rungs.findIndex((r) => r.isCurrent);
    return chosen ?? rungs[Math.min(currentIdx + 1, rungs.length - 1)] ?? rungs[0];
  });

  /** Todo lo que se acumula entre el plan vigente y el peldaño elegido. */
  protected readonly stepGains = computed(() => {
    const rungs = this.ladder();
    const target = this.selectedStep();
    if (!target) return [];
    const currentIdx = rungs.findIndex((r) => r.isCurrent);
    if (target.idx <= currentIdx) {
      // Mirando el propio peldaño (o uno menor): se lista lo que ya se tiene.
      const features = target.plan.features ?? {};
      return Object.keys(features)
        .filter((key) => features[key] === true)
        .map((key) => FEATURE_LABELS_ES[key] ?? key);
    }
    const currentFeatures = rungs[currentIdx]?.plan.features ?? {};
    const gained: string[] = [];
    for (let i = currentIdx + 1; i <= target.idx; i++) {
      const features = rungs[i].plan.features ?? {};
      Object.keys(features)
        .filter((key) => features[key] === true && currentFeatures[key] !== true)
        .forEach((key) => {
          const label = FEATURE_LABELS_ES[key] ?? key;
          if (gained.indexOf(label) === -1) gained.push(label);
        });
    }
    return gained;
  });

  protected readonly stepJumps = computed<QuotaJump[]>(() => {
    const rungs = this.ladder();
    const target = this.selectedStep();
    const currentIdx = rungs.findIndex((r) => r.isCurrent);
    if (!target || target.idx <= currentIdx) return [];
    const from = rungs[currentIdx]?.plan.quotas ?? {};
    return Object.entries(target.plan.quotas ?? {})
      .filter(([key, to]) => to === -1 || typeof from[key] !== 'number' || to > from[key])
      .map(([key, to]) => ({ key, from: from[key], to }));
  });

  /** Lo que distingue a este peldaño del anterior, en una línea. */
  private stepHeadline(plans: Plan[], idx: number): string {
    if (idx === 0) return plans[idx].description ?? '';
    const prev = plans[idx - 1].features ?? {};
    const here = plans[idx].features ?? {};
    const added = Object.keys(here).filter((key) => here[key] === true && prev[key] !== true);
    if (added.length === 0) return 'Más capacidad';
    return '+ ' + (FEATURE_LABELS_ES[added[0]] ?? added[0]);
  }

  protected readonly currentPlanName = computed(
    () => this.currentPlanObj() ?? { name: this.subscription()?.plan_name ?? 'Gratis' } as Plan,
  );

  protected readonly stepDeltaLabel = computed(() => {
    const step = this.selectedStep();
    if (!step) return '';
    const current = this.currentPlanObj();
    if (step.isCurrent) {
      return step.plan.monthly_price === 0 ? 'S/ 0 al mes' : `S/ ${step.plan.monthly_price} al mes`;
    }
    const delta = step.plan.monthly_price - (current?.monthly_price ?? 0);
    return delta >= 0
      ? `S/ ${delta} más al mes`
      : `S/ ${Math.abs(delta)} menos al mes`;
  });

  protected readonly stepHowText = computed(() => {
    const step = this.selectedStep();
    if (!step) return '';
    if (step.isCurrent) {
      return step.plan.monthly_price === 0
        ? 'Ya estás acá. El plan Gratis no vence: se queda mientras lo necesites.'
        : 'Es tu plan vigente. Se renueva solo cada mes.';
    }
    if (step.assisted) {
      return `${planLabel(step.plan)} se arma con nuestro equipo: revisamos tu operación, migramos lo que haga falta y lo dejamos andando. No se contrata solo desde esta pantalla.`;
    }
    if (step.isBelow) {
      return 'El cambio a un plan menor aplica al final del período que ya pagaste.';
    }
    return 'Al confirmar te llevamos a MercadoPago. El cambio aplica de inmediato y el cobro sale prorrateado.';
  });

  /** Contacto para los planes asistidos. No hay flujo self-serve que ofrecer. */
  protected readonly assistedContactHref = computed(() => {
    const step = this.selectedStep();
    const plan = step ? planLabel(step.plan) : '';
    return `mailto:hola@proxima.pe?subject=${encodeURIComponent('Quiero activar el plan ' + plan)}`;
  });

  protected pickStep(planId: string): void {
    this.selectedPlanId.set(planId);
  }

  /** «Tu plan de hoy», o el estado real cuando no es el normal. */
  protected readonly currentStatusLabel = computed(() => {
    const status = this.subscription()?.status;
    if (status === 'cancelled') return 'Cancelado';
    if (status === 'trial') return 'En prueba';
    return 'Tu plan de hoy';
  });

  protected planTitle(plan: Plan): string {
    return planLabel(plan);
  }

  protected planSubtitle(plan: Plan): string {
    const [, ...rest] = plan.name.split('—');
    const tail = rest.join('—').trim();
    return tail || plan.description || '';
  }

  /**
   * `1000` → `1.000`; `-1` es ilimitado en el ladder del API.
   *
   * `undefined` es un caso real, no defensivo: Crece declara
   * `invoices_per_month` y Emprende no, así que al saltar de uno a otro el
   * «desde» no existe. Se dice «—», no se revienta la página.
   */
  protected quotaValue(value: number | undefined): string {
    if (value === undefined) return '—';
    if (value === -1) return 'ilimitado';
    return value.toLocaleString('es-PE');
  }

  protected isDowngrade(plan: Plan): boolean {
    const current = this.currentPlanObj();
    if (!current) return false;
    return plan.monthly_price < current.monthly_price;
  }

  protected usagePct(item: UsageSummary): number {
    if (!item.limit) return 0;
    return Math.min(100, Math.round((item.current / item.limit) * 100));
  }

  protected statusLabel(status: string): string {
    return (
      ({ active: 'Activo', trial: 'Prueba', cancelled: 'Cancelado', past_due: 'Vencido' } as Record<string, string>)[status]
      ?? status
    );
  }

  // ---------------------------------------------------------------------------
  // Upgrade (checkout → MercadoPago)
  // ---------------------------------------------------------------------------

  /** Única salida del componente hacia el navegador (seam de prueba). */
  protected navigateTo(url: string): void {
    window.location.href = url;
  }

  protected readonly upgrading = signal(false);
  protected readonly upgradeError = signal<string | null>(null);

  protected async upgrade(planId: string): Promise<void> {
    if (this.upgrading()) return;
    this.upgrading.set(true);
    this.upgradeError.set(null);
    try {
      const back = `${window.location.origin}/plan`;
      const res = await firstValueFrom(
        this.http.post<{ checkout_url: string }>('billing/checkout', {
          plan_id: planId,
          success_url: `${back}?status=success`,
          failure_url: `${back}?status=failure`,
        }),
      );
      if (res?.checkout_url) {
        this.navigateTo(res.checkout_url);
        return;
      }
      this.upgradeError.set('No se pudo iniciar el pago. Intenta de nuevo.');
    } catch {
      this.upgradeError.set('No se pudo iniciar el pago. Intenta de nuevo.');
    } finally {
      this.upgrading.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Downgrade (subscription change, end-of-period)
  // ---------------------------------------------------------------------------

  protected readonly downgradeConfirmId = signal<string | null>(null);
  protected readonly actionLoading = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly downgradeError = signal<string | null>(null);

  protected async confirmDowngrade(): Promise<void> {
    const planId = this.downgradeConfirmId();
    if (!planId || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.downgradeError.set(null);
    try {
      await firstValueFrom(
        this.http.post('billing/subscription/change', { plan_id: planId }),
      );
      this.downgradeConfirmId.set(null);
      this.subRes.reload();
    } catch {
      this.downgradeError.set('No se pudo cambiar el plan. Intenta de nuevo.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Cancel subscription
  // ---------------------------------------------------------------------------

  protected readonly cancelConfirm = signal(false);

  protected async doCancel(): Promise<void> {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.actionError.set(null);
    try {
      await firstValueFrom(this.http.post('billing/subscription/cancel', {}));
      this.cancelConfirm.set(false);
      this.subRes.reload();
    } catch {
      this.actionError.set('No se pudo cancelar la suscripción. Intenta de nuevo.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Add-ons
  // ---------------------------------------------------------------------------

  protected readonly addons = computed(() =>
    ADDON_DEFS.filter((a) => {
      if (a.key === 'tienda_web') return !!this.runtimeConfig.builderUrl();
      if (a.key === 'precios_inteligentes') return !!this.runtimeConfig.intelligenceUrl();
      return true;
    }),
  );

  protected hasAddon(addon: AddonDef): boolean {
    return !!this.businessCtx.entitlements()?.[addon.entitlementKey];
  }

  /**
   * Cada add-on con su piso de plan resuelto contra el catálogo real: el rango
   * sale del precio, que es el mismo orden del `PLAN_LADDER` del API.
   */
  protected readonly addonCards = computed(() => {
    const plans = this.plans();
    const current = this.currentPlanObj();
    const rank = (planId: string | undefined) =>
      planId ? plans.findIndex((p) => p.id === planId) : -1;
    const currentRank = rank(current?.id);

    return this.addons().map((addon) => {
      const floorRank = rank(addon.minPlan);
      const locked = floorRank > -1 && currentRank > -1 && currentRank < floorRank;
      return {
        def: addon,
        key: addon.key,
        active: this.hasAddon(addon),
        locked,
        minPlanLabel: plans[floorRank]?.name ?? addon.minPlan ?? '',
      };
    });
  });

  protected readonly totalBreakdown = computed(() => {
    const plan = this.currentPlanObj();
    const active = this.addonCards().filter((card) => card.active);
    const planPart = plan ? `${plan.name} S/ ${plan.monthly_price}` : 'Plan Gratis S/ 0';
    if (active.length === 0) return `${planPart}, sin add-ons`;
    return [planPart, ...active.map((c) => `${c.def.name} S/ ${c.def.monthlyPrice}`)].join('  +  ');
  });

  /** Plan vigente más los add-ons activos: lo que se cobra este mes, en un número. */
  protected readonly monthlyTotal = computed(() => {
    const planPrice = this.currentPlanObj()?.monthly_price ?? 0;
    const addonsPrice = this.addonCards()
      .filter((card) => card.active)
      .reduce((sum, card) => sum + card.def.monthlyPrice, 0);
    return planPrice + addonsPrice;
  });

  protected readonly addonLoading = signal<string | null>(null);
  protected readonly addonError = signal<string | null>(null);

  protected async contractAddon(addonKey: string): Promise<void> {
    if (this.addonLoading()) return;

    // Piso de plan: `provision_addon` lo rechazaría igual, pero después de
    // haber prometido algo. Se corta acá, con el motivo escrito.
    const card = this.addonCards().find((c) => c.key === addonKey);
    if (card?.locked) {
      this.addonError.set(
        `${card.def.name} necesita el plan ${card.minPlanLabel} o superior.`,
      );
      return;
    }

    // `tienda_web` no puede empezar por el cobro: `provision_addon` exige el
    // `template_id` del diseño elegido (TEMPLATE_REQUIRED), así que un checkout
    // sin diseño cobra y después falla al provisionar — el comercio paga y no
    // recibe nada. El asistente junta diseño, subdominio y respuestas primero.
    // Que el asistente arranque el cobro es lo que falta: bead proxima-api-3wy.
    if (addonKey === 'tienda_web') {
      const admin = this.runtimeConfig.adminUrl();
      if (!admin) {
        this.addonError.set('No pudimos abrir el asistente de tienda web.');
        return;
      }
      this.navigateTo(`${admin}/websites/nueva`);
      return;
    }
    this.addonLoading.set(addonKey);
    this.addonError.set(null);
    try {
      const back = `${window.location.origin}/plan`;
      const res = await firstValueFrom(
        this.http.post<{ checkout_url: string }>('billing/addon/checkout', {
          addon_key: addonKey,
          success_url: `${back}?status=success`,
          failure_url: `${back}?status=failure`,
        }),
      );
      if (res?.checkout_url) {
        this.navigateTo(res.checkout_url);
      } else {
        this.addonError.set('No se pudo iniciar el pago. Intenta de nuevo.');
      }
    } catch {
      this.addonError.set('No se pudo iniciar el pago. Intenta de nuevo.');
    } finally {
      this.addonLoading.set(null);
    }
  }

  protected async cancelAddon(addonKey: string): Promise<void> {
    if (this.addonLoading()) return;
    this.addonLoading.set(addonKey);
    this.addonError.set(null);
    try {
      await firstValueFrom(this.http.post('billing/addon/cancel', { addon_key: addonKey }));
      this.subRes.reload();
    } catch {
      this.addonError.set('No se pudo cancelar el add-on. Intenta de nuevo.');
    } finally {
      this.addonLoading.set(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Payment history
  // ---------------------------------------------------------------------------

  private readonly paymentsRes = resource({
    loader: async () => {
      if (!this.businessCtx.businessId()) return [];
      try {
        return await firstValueFrom(
          this.http.get<Payment[]>('admin/billing/subscription/payments'),
        );
      } catch {
        return [];
      }
    },
  });

  protected readonly payments = computed(() => this.paymentsRes.value() ?? []);
  protected readonly paymentsLoading = this.paymentsRes.isLoading;

  protected paymentAmount(p: Payment): string {
    const sym = p.currency ?? 'S/';
    return `${sym} ${p.amount.toFixed(2)}`;
  }

  protected paymentStatusLabel(status: string): string {
    return (
      ({ paid: 'Pagado', pending: 'Pendiente', failed: 'Fallido' } as Record<string, string>)[status]
      ?? status
    );
  }
}
