import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BusinessContextService } from '@proxima/auth';
import { QuotaLabelPipe } from '../../../shared/pipes/quota-label.pipe';

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  description?: string;
}

interface UsageSummary {
  resource: string;
  limit: number;
  current: number;
}

interface SubscriptionStatus {
  plan_name: string;
  status: string;
  usage: UsageSummary[];
}

@Component({
  selector: 'app-plan-page',
  standalone: true,
  imports: [QuotaLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="page-root">
  <h1 class="page-h1">Plan</h1>

  <!-- Current plan -->
  <section class="page-card" aria-labelledby="current-plan-h">
    <h2 class="card-h2" id="current-plan-h">Plan actual</h2>

    @if (subLoading()) {
      <div class="skeleton" role="status" aria-label="Cargando plan"></div>
    } @else if (subscription(); as sub) {
      <div class="plan-header">
        <span class="plan-name">{{ sub.plan_name }}</span>
        <span class="plan-status-badge" [class.active]="sub.status === 'active'">
          {{ sub.status === 'active' ? 'Activo' : sub.status === 'trial' ? 'Prueba' : sub.status }}
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
                <div
                  class="usage-bar"
                  role="progressbar"
                  [attr.aria-valuenow]="usagePct(item)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  [attr.aria-label]="(item.resource | quotaLabel) + ': ' + item.current + ' de ' + item.limit"
                >
                  <span [style.width.%]="usagePct(item)"></span>
                </div>
              }
            </div>
          }
        </div>
      }
      <button class="btn-primary" type="button" (click)="upgrade()">
        Mejorar plan
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    } @else {
      <!-- Fallback while CORS gap -->
      <div class="plan-header">
        <span class="plan-name">Gratis</span>
        <span class="plan-status-badge">Prueba</span>
      </div>
      <p class="plan-desc">Estás probando Próxima sin límite de tiempo.</p>
      <button class="btn-primary" type="button" (click)="upgrade()">
        Salir en vivo
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    }
  </section>

  <!-- Available plans -->
  @if (!plansLoading() && plans().length > 0) {
    <section class="page-card" aria-labelledby="plans-h">
      <h2 class="card-h2" id="plans-h">Planes disponibles</h2>
      <ul class="plans-list" role="list">
        @for (plan of plans(); track plan.id) {
          <li class="plan-row" role="listitem">
            <span class="plan-row-name">{{ plan.name }}</span>
            <span class="plan-row-price">S/ {{ plan.monthly_price }} / mes</span>
            <button class="btn-outline" type="button" (click)="upgrade()">Elegir</button>
          </li>
        }
      </ul>
    </section>
  }
</div>
  `,
  styles: [`
:host { display: block; }

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

.plan-status-badge.active {
  background: #dcfce7;
  color: #15803d;
}

.plan-desc {
  font-size: 0.875rem;
  color: var(--muted);
  margin: 0 0 1.25rem;
}

.usage-not-included {
  font-weight: 400 !important;
  font-style: italic;
  color: var(--faint) !important;
}

.plans-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.plan-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--line-soft);
}

.plan-row:last-child { border-bottom: none; }

.plan-row-name {
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ink);
}

.plan-row-price {
  font-size: 0.875rem;
  color: var(--muted);
  margin-right: 0.5rem;
}
  `],
})
export class PlanPageComponent {
  private readonly http = inject(HttpClient);
  private readonly businessCtx = inject(BusinessContextService);

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

  private readonly plansRes = resource({
    loader: async () => {
      try {
        return await firstValueFrom(this.http.get<Plan[]>('billing/plans'));
      } catch {
        return [];
      }
    },
  });

  protected readonly subscription = computed(() => this.subRes.value() ?? null);
  protected readonly subLoading = this.subRes.isLoading;
  protected readonly plans = computed(() => this.plansRes.value() ?? []);
  protected readonly plansLoading = this.plansRes.isLoading;

  protected usagePct(item: UsageSummary): number {
    if (!item.limit) return 0;
    return Math.min(100, Math.round((item.current / item.limit) * 100));
  }

  protected upgrade(): void {
    // Wired in Fase 8 when CORS is enabled
  }
}
