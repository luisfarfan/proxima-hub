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
import { DatePipe } from '@angular/common';
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
  features?: Record<string, boolean>;
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
  /** Website add-ons need the merchant to pick a template before checkout. */
  needsTemplate?: boolean;
}

interface WebsiteTemplate {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  industry?: string | null;
  preview_image?: string | null;
}

const ADDON_DEFS: AddonDef[] = [
  {
    key: 'tienda_web',
    name: 'Tienda Web',
    description: 'Diseña y publica tu tienda online',
    entitlementKey: 'cms',
    needsTemplate: true,
  },
  {
    key: 'precios_inteligentes',
    name: 'Intelligence',
    description: 'Precios y decisiones con IA',
    entitlementKey: 'pricing_intelligence',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-plan-page',
  standalone: true,
  imports: [QuotaLabelPipe, DatePipe],
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

  <!-- ── Plan actual ──────────────────────────────────────────────────── -->
  <section class="page-card" aria-labelledby="current-plan-h">
    <h2 class="card-h2" id="current-plan-h">Plan actual</h2>

    @if (subLoading()) {
      <div class="skeleton" role="status" aria-label="Cargando plan"></div>
    } @else if (subscription(); as sub) {
      <div class="plan-header">
        <span class="plan-name">{{ sub.plan_name }}</span>
        <span class="plan-status-badge"
              [class.active]="sub.status === 'active'"
              [class.trial]="sub.status === 'trial'"
              [class.cancelled]="sub.status === 'cancelled'">
          {{ statusLabel(sub.status) }}
        </span>
      </div>

      @if (sub.usage.length > 0) {
        <div class="usage-list" aria-label="Uso del plan">
          @for (item of sub.usage; track item.resource) {
            <div class="usage-item">
              <div class="usage-row">
                <span class="usage-label">{{ item.resource | quotaLabel }}</span>
                @if (item.limit === 0) {
                  <span class="usage-count usage-not-included">No incluido</span>
                } @else {
                  <span class="usage-count">{{ item.current }} / {{ item.limit }}</span>
                }
              </div>
              @if (item.limit > 0) {
                <div class="usage-bar"
                     role="progressbar"
                     [attr.aria-valuenow]="usagePct(item)"
                     aria-valuemin="0"
                     aria-valuemax="100"
                     [attr.aria-label]="(item.resource | quotaLabel) + ': ' + item.current + ' de ' + item.limit">
                  <span [style.width.%]="usagePct(item)"></span>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (sub.status === 'cancelled' && sub.current_period_end) {
        <p class="cancelled-note">
          Tienes acceso hasta el <strong>{{ sub.current_period_end | date:'d MMM yyyy' : undefined : 'es-PE' }}</strong>.
        </p>
      }

      @if (sub.status === 'active' || sub.status === 'trial') {
        <div class="plan-actions">
          <button class="btn-danger-sm" type="button" (click)="cancelConfirm.set(true)">
            Cancelar suscripción
          </button>
        </div>
      }
    } @else {
      <div class="plan-header">
        <span class="plan-name">Gratis</span>
        <span class="plan-status-badge">Prueba</span>
      </div>
      <p class="plan-desc">Estás en el plan gratuito de Próxima.</p>
    }
  </section>

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

  <!-- ── Planes disponibles ───────────────────────────────────────────── -->
  @if (!plansLoading() && plans().length > 0) {
    <section class="page-card" aria-labelledby="plans-h">
      <h2 class="card-h2" id="plans-h">Planes disponibles</h2>
      <ul class="plans-list" role="list">
        @for (plan of plans(); track plan.id) {
          <li class="plan-row"
              [class.highlighted]="targetPlanId() === plan.id && !isCurrent(plan)"
              [class.current-row]="isCurrent(plan)"
              role="listitem">
            <div class="plan-row-info">
              <span class="plan-row-name">
                {{ plan.name }}
                @if (isCurrent(plan)) {
                  <span class="plan-current-badge">Plan actual</span>
                } @else if (targetPlanId() === plan.id) {
                  <span class="plan-recommended-badge">Recomendado</span>
                }
              </span>
              @if (plan.description) {
                <span class="plan-row-desc">{{ plan.description }}</span>
              }
            </div>
            <div class="plan-row-right">
              <span class="plan-row-price">
                @if (plan.monthly_price === 0) { Gratis
                } @else { S/ {{ plan.monthly_price }} / mes }
              </span>
              @if (!isCurrent(plan)) {
                @if (isDowngrade(plan)) {
                  @if (downgradeConfirmId() === plan.id) {
                    <div class="inline-confirm">
                      <span class="inline-confirm-label">¿Confirmar?</span>
                      <button class="btn-danger-sm" type="button" [disabled]="actionLoading()" (click)="confirmDowngrade()">
                        {{ actionLoading() ? '…' : 'Sí' }}
                      </button>
                      <button class="btn-outline" type="button" (click)="downgradeConfirmId.set(null)">No</button>
                    </div>
                  } @else {
                    <button class="btn-outline" type="button" (click)="downgradeConfirmId.set(plan.id)">
                      Bajar de plan
                    </button>
                  }
                } @else {
                  <button class="btn-primary" type="button" [disabled]="upgrading()" (click)="upgrade(plan.id)">
                    {{ targetPlanId() === plan.id ? 'Elegir' : 'Mejorar' }}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </button>
                }
              }
            </div>
          </li>
        }
      </ul>
      @if (upgradeError()) {
        <p class="field-error" role="alert">{{ upgradeError() }}</p>
      }
      @if (downgradeError()) {
        <p class="field-error" role="alert">{{ downgradeError() }}</p>
      }
    </section>
  }

  <!-- ── Add-ons ───────────────────────────────────────────────────────── -->
  @if (addons().length > 0) {
    <section class="page-card" aria-labelledby="addons-h">
      <h2 class="card-h2" id="addons-h">Add-ons</h2>
      <ul class="plans-list" role="list">
        @for (addon of addons(); track addon.key) {
          <li class="plan-row" role="listitem">
            <div class="plan-row-info">
              <span class="plan-row-name">{{ addon.name }}</span>
              <span class="plan-row-desc">{{ addon.description }}</span>
            </div>
            <div class="plan-row-right">
              @if (hasAddon(addon)) {
                <span class="addon-active-badge">Activo</span>
                <button class="btn-danger-sm" type="button"
                        [disabled]="addonLoading() === addon.key"
                        (click)="cancelAddon(addon.key)">
                  {{ addonLoading() === addon.key ? 'Cancelando…' : 'Cancelar' }}
                </button>
              } @else {
                <button class="btn-outline" type="button"
                        [disabled]="addonLoading() === addon.key"
                        (click)="contractAddon(addon.key)">
                  {{ addonLoading() === addon.key ? '…' : 'Contratar' }}
                </button>
              }
            </div>
          </li>
        }
      </ul>
      @if (addonError()) {
        <p class="field-error" role="alert">{{ addonError() }}</p>
      }
    </section>
  }

  <!-- ── Selector de plantilla (Tienda Web) ────────────────────────────── -->
  @if (templatePickerOpen()) {
    <div class="tpl-backdrop" (click)="closeTemplatePicker()" aria-hidden="true"></div>
    <div class="tpl-modal" role="dialog" aria-modal="true" aria-labelledby="tpl-h">
      <div class="tpl-modal-head">
        <h2 class="card-h2" id="tpl-h">Elige tu plantilla</h2>
        <button class="tpl-x" type="button" (click)="closeTemplatePicker()" aria-label="Cerrar">✕</button>
      </div>
      <p class="tpl-sub">Tu tienda se crea con esta plantilla; la podrás editar después en el Builder.</p>

      @if (templatesLoading()) {
        <p class="tpl-state">Cargando plantillas…</p>
      } @else if (templates().length === 0) {
        <p class="tpl-state">No hay plantillas disponibles por ahora.</p>
      } @else {
        <ul class="tpl-grid" role="list">
          @for (t of templates(); track t.id) {
            <li>
              <button
                type="button"
                class="tpl-card"
                [class.tpl-card--on]="selectedTemplateId() === t.id"
                (click)="selectedTemplateId.set(t.id)"
                [attr.aria-pressed]="selectedTemplateId() === t.id"
              >
                <span class="tpl-thumb">
                  @if (t.preview_image) {
                    <img [src]="t.preview_image" [alt]="t.name" loading="lazy" />
                  } @else {
                    <span class="tpl-thumb-fallback" aria-hidden="true">🌐</span>
                  }
                </span>
                <span class="tpl-name">{{ t.name }}</span>
                @if (t.industry || t.category) {
                  <span class="tpl-meta">{{ t.industry || t.category }}</span>
                }
              </button>
            </li>
          }
        </ul>
      }

      <div class="tpl-actions">
        <button class="btn-outline" type="button" (click)="closeTemplatePicker()">Cancelar</button>
        <button
          class="btn-primary"
          type="button"
          [disabled]="!selectedTemplateId()"
          (click)="confirmTemplateAndCheckout()"
        >
          Continuar al pago
        </button>
      </div>
    </div>
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
  styles: [`
:host { display: block; }

/* Plan header */
.plan-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.plan-name {
  font-family: var(--font-display);
  font-size: 1.625rem;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.01em;
}

.plan-status-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f0ec;
  color: var(--muted);
}

.plan-status-badge.active  { background: #dcfce7; color: #15803d; }
.plan-status-badge.trial   { background: #fef9c3; color: #92400e; }
.plan-status-badge.cancelled { background: #fee2e2; color: #b91c1c; }

.plan-desc, .cancelled-note {
  font-size: 0.875rem;
  color: var(--muted);
  margin: 0 0 0.75rem;
}

.plan-actions {
  margin-top: 1.25rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.usage-not-included {
  font-weight: 400 !important;
  font-style: italic;
  color: var(--faint) !important;
}

/* Plans list */
.plans-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 0;
  border-bottom: 1px solid var(--line-soft);
}

.plan-row:last-child { border-bottom: none; }

.plan-row.highlighted {
  margin: 0 -1.5rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  background: #f8f7ff;
  border-radius: 0.5rem;
  border-bottom: none;
  outline: 1.5px solid var(--accent);
}

.plan-row.current-row { opacity: 0.6; }

.plan-row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.plan-row-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.plan-row-desc {
  font-size: 0.8125rem;
  color: var(--muted);
}

.plan-current-badge, .plan-recommended-badge {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
}

.plan-current-badge     { background: #f1f0ec; color: var(--muted); }
.plan-recommended-badge { background: var(--accent); color: #fff; }

.plan-row-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.plan-row-price {
  font-size: 0.875rem;
  color: var(--muted);
  white-space: nowrap;
}

/* Inline downgrade confirm */
.inline-confirm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.inline-confirm-label {
  font-size: 0.8125rem;
  color: var(--muted);
  white-space: nowrap;
}

/* Add-on active badge */
.addon-active-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: #dcfce7;
  color: #15803d;
}

/* Flash alert */
.alert {
  border-radius: 0.6rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
.alert-error   { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }

/* Cancel confirmation card */
.confirm-card {
  border: 1px solid rgba(185, 28, 28, 0.25);
  border-radius: 0.875rem;
  background: #fff9f9;
  padding: 1.5rem;
}

.confirm-h {
  font-family: var(--font-heading);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.6rem;
}

.confirm-body {
  font-size: 0.875rem;
  color: var(--muted);
  margin: 0 0 1.1rem;
  line-height: 1.55;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-primary.btn-danger             { background: #b91c1c; }
.btn-primary.btn-danger:hover:not([disabled]) { background: #991b1b; }

/* Payment history table */
.payments-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.payments-table th {
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  padding: 0.4rem 0.5rem 0.75rem;
  border-bottom: 1px solid var(--line);
}

.payments-table th:first-child,
.payments-table td:first-child { padding-left: 0; }

.payments-table td {
  padding: 0.75rem 0.5rem;
  color: var(--ink);
  border-bottom: 1px solid var(--line-soft);
  vertical-align: middle;
}

.payments-table tr:last-child td { border-bottom: none; }

.payment-status {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f0ec;
  color: var(--muted);
}

.payment-status.paid    { background: #dcfce7; color: #15803d; }
.payment-status.pending { background: #fef9c3; color: #92400e; }
.payment-status.failed  { background: #fee2e2; color: #b91c1c; }

/* Template picker modal */
.tpl-backdrop {
  position: fixed; inset: 0; z-index: 40;
  background: rgba(13, 37, 61, 0.45);
}
.tpl-modal {
  position: fixed; z-index: 41;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(680px, 92vw); max-height: 86vh; overflow: auto;
  background: var(--bg, #fff); border: 1px solid var(--border, #e7e5e0);
  border-radius: 16px; box-shadow: 0 24px 60px -16px rgba(13, 37, 61, 0.35);
  padding: 1.25rem 1.25rem 1rem;
}
.tpl-modal-head { display: flex; align-items: center; justify-content: space-between; }
.tpl-x {
  border: none; background: transparent; cursor: pointer;
  font-size: 1rem; color: var(--muted); padding: 4px 8px; border-radius: 8px;
}
.tpl-x:hover { background: #f1f0ec; }
.tpl-sub { font-size: 0.8125rem; color: var(--muted); margin: 4px 0 1rem; }
.tpl-state { font-size: 0.875rem; color: var(--muted); padding: 1.5rem 0; text-align: center; }
.tpl-grid {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem;
}
.tpl-card {
  display: flex; flex-direction: column; gap: 6px; width: 100%;
  border: 1px solid var(--border, #e7e5e0); border-radius: 12px; padding: 8px;
  background: var(--bg, #fff); cursor: pointer; text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.tpl-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -14px rgba(13, 37, 61, 0.3); }
.tpl-card--on { border-color: var(--brand, #2563eb); box-shadow: 0 0 0 2px var(--brand, #2563eb); }
.tpl-thumb {
  display: flex; align-items: center; justify-content: center;
  aspect-ratio: 16 / 10; border-radius: 8px; overflow: hidden; background: #f1f0ec;
}
.tpl-thumb img { width: 100%; height: 100%; object-fit: cover; }
.tpl-thumb-fallback { font-size: 1.5rem; opacity: 0.6; }
.tpl-name { font-size: 0.8125rem; font-weight: 600; color: var(--ink); }
.tpl-meta { font-size: 0.6875rem; color: var(--muted); text-transform: capitalize; }
.tpl-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; }
  `],
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

  protected readonly plans = computed(() => this.plansRes.value() ?? []);
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
        window.location.href = res.checkout_url;
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

  protected readonly addonLoading = signal<string | null>(null);
  protected readonly addonError = signal<string | null>(null);

  // --- Template picker (website add-ons need a chosen template) ---
  protected readonly templatePickerOpen = signal<boolean>(false);
  protected readonly templates = signal<WebsiteTemplate[]>([]);
  protected readonly templatesLoading = signal<boolean>(false);
  protected readonly selectedTemplateId = signal<string | null>(null);

  protected async contractAddon(addonKey: string): Promise<void> {
    if (this.addonLoading()) return;
    const def = ADDON_DEFS.find((a) => a.key === addonKey);
    // Website add-ons require the merchant to pick a template first.
    if (def?.needsTemplate) {
      await this.openTemplatePicker();
      return;
    }
    await this.startAddonCheckout(addonKey);
  }

  private async openTemplatePicker(): Promise<void> {
    this.addonError.set(null);
    this.selectedTemplateId.set(null);
    this.templatePickerOpen.set(true);
    if (this.templates().length === 0) {
      this.templatesLoading.set(true);
      try {
        const list = await firstValueFrom(
          this.http.get<WebsiteTemplate[]>('storefront/cms/website-templates'),
        );
        this.templates.set(list ?? []);
      } catch {
        this.addonError.set('No se pudieron cargar las plantillas. Intenta de nuevo.');
      } finally {
        this.templatesLoading.set(false);
      }
    }
  }

  protected closeTemplatePicker(): void {
    this.templatePickerOpen.set(false);
  }

  protected async confirmTemplateAndCheckout(): Promise<void> {
    const templateId = this.selectedTemplateId();
    if (!templateId) return;
    this.templatePickerOpen.set(false);
    await this.startAddonCheckout('tienda_web', templateId);
  }

  private async startAddonCheckout(addonKey: string, templateId?: string): Promise<void> {
    this.addonLoading.set(addonKey);
    this.addonError.set(null);
    try {
      const back = `${window.location.origin}/plan`;
      const res = await firstValueFrom(
        this.http.post<{ checkout_url: string }>('billing/addon/checkout', {
          addon_key: addonKey,
          success_url: `${back}?status=success`,
          failure_url: `${back}?status=failure`,
          ...(templateId ? { template_id: templateId } : {}),
        }),
      );
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
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
