import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, BusinessContextService } from '@luisfarfan/auth';
import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { QuotaLabelPipe } from '../../../shared/pipes/quota-label.pipe';

// entitlement key for each add-on app (matches businessCtx.entitlements())
const ADD_ON_FEATURE_KEY: Record<string, string> = {
  tienda: 'cms',
  intelligence: 'pricing_intelligence',
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
  addOn: boolean;
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
  imports: [QuotaLabelPipe, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly businessCtx = inject(BusinessContextService);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly router = inject(Router);

  // --- User / business (needed for hero section) ---
  protected readonly user = this.auth.user;
  protected readonly memberships = this.auth.memberships;

  protected readonly firstName = computed(() => {
    const n = this.user()?.full_name;
    return n ? n.split(' ')[0] : 'tú';
  });

  protected readonly activeBusinessName = computed(() => {
    const bizId = this.businessCtx.businessId();
    return this.memberships().find((m) => m.id === bizId)?.name ?? 'Mi negocio';
  });

  // --- App switcher ---
  protected readonly apps = computed((): HubApp[] => {
    const e = this.businessCtx.entitlements();
    const has = (key: string) => !!e?.[key];

    const candidates: Array<HubApp | null> = [
      {
        key: 'panel',
        name: 'Panel',
        desc: 'Catálogo, pedidos, stock y clientes',
        icon: 'panel',
        url: this.runtimeConfig.adminUrl() ?? '',
        addOn: false,
      },
      {
        key: 'caja',
        name: 'Caja',
        desc: 'Vende en mostrador, sin fricción',
        icon: 'caja',
        url: this.runtimeConfig.posUrl() ?? '',
        addOn: false,
      },
      this.runtimeConfig.builderUrl()
        ? {
            key: 'tienda',
            name: 'Tienda Web',
            desc: 'Diseña y publica tu tienda online',
            icon: 'tienda',
            url: this.runtimeConfig.builderUrl()!,
            addOn: !has('cms'),
          }
        : null,
      this.runtimeConfig.intelligenceUrl()
        ? {
            key: 'intelligence',
            name: 'Intelligence',
            desc: 'Precios y decisiones con IA',
            icon: 'intelligence',
            url: this.runtimeConfig.intelligenceUrl()!,
            addOn: !has('pricing_intelligence'),
          }
        : null,
      this.runtimeConfig.mobileUrl()
        ? {
            key: 'app',
            name: 'App',
            desc: 'Tu negocio en el celular',
            icon: 'app',
            url: this.runtimeConfig.mobileUrl()!,
            addOn: false,
          }
        : null,
    ];

    return candidates.filter((a): a is HubApp => a !== null && !!a.url);
  });

  // --- Subscription / plan card ---
  private readonly billingRes = resource({
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

  protected readonly subscription = computed(() => this.billingRes.value() ?? null);
  protected readonly subscriptionLoading = this.billingRes.isLoading;

  protected readonly usageItems = computed(
    () => (this.subscription()?.usage ?? []).slice(0, 2),
  );

  protected usagePct(item: UsageSummary): number {
    if (!item.limit) return 0;
    return Math.min(100, Math.round((item.current / item.limit) * 100));
  }

  // --- Business status / onboarding checklist ---
  private readonly statusRes = resource({
    loader: async () => {
      if (!this.businessCtx.businessId()) return null;
      try {
        return await firstValueFrom(
          this.http.get<BusinessStatus>('admin/business/status'),
        );
      } catch {
        return null;
      }
    },
  });

  protected readonly statusLoading = this.statusRes.isLoading;

  protected readonly checklistItems = computed((): ReadinessItem[] => {
    const status = this.statusRes.value();
    if (!status) return FALLBACK_CHECKLIST;
    return status.readiness.sections
      .flatMap((s) => s.items)
      .filter((it) => it.status !== 'obsoleted');
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

  // --- Actions ---
  protected openApp(app: HubApp): void {
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
    window.location.href = app.url;
  }
}
