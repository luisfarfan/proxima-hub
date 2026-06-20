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

  // Effective permission codes the user holds in the ACTIVE business.
  // Served by GET /me → active_business.permissions (not yet in the auth lib's
  // public type, so read defensively); '*' = super admin.
  private readonly userPermissions = computed((): ReadonlySet<string> => {
    const ab = this.user()?.active_business as { permissions?: string[] } | null | undefined;
    return new Set(ab?.permissions ?? []);
  });

  // --- App switcher ---
  protected readonly apps = computed((): HubApp[] => {
    const e = this.businessCtx.entitlements();
    const has = (key: string) => !!e?.[key];
    const perms = this.userPermissions();
    const hasAnyPerm = (codes?: string[]) =>
      !codes?.length || perms.has('*') || codes.some((c) => perms.has(c));

    const build = (app: Omit<HubApp, 'addOn' | 'noAccess'>): HubApp => {
      const gate = APP_GATES[app.key] ?? {};
      // Plan gate first: an un-entitled business is an upsell, regardless of role.
      const addOn = !!gate.entitlement && !has(gate.entitlement);
      // Permission gate only matters once the business is entitled.
      const noAccess = !addOn && !hasAnyPerm(gate.anyPerm);
      return { ...app, addOn, noAccess };
    };

    const candidates: Array<HubApp | null> = [
      build({ key: 'panel', name: 'Panel', desc: 'Catálogo, pedidos, stock y clientes', icon: 'panel', url: this.runtimeConfig.adminUrl() ?? '' }),
      build({ key: 'caja', name: 'Caja', desc: 'Vende en mostrador, sin fricción', icon: 'caja', url: this.runtimeConfig.posUrl() ?? '' }),
      this.runtimeConfig.builderUrl()
        ? build({ key: 'tienda', name: 'Tienda Web', desc: 'Diseña y publica tu tienda online', icon: 'tienda', url: this.runtimeConfig.builderUrl()! })
        : null,
      this.runtimeConfig.intelligenceUrl()
        ? build({ key: 'intelligence', name: 'Intelligence', desc: 'Precios y decisiones con IA', icon: 'intelligence', url: this.runtimeConfig.intelligenceUrl()! })
        : null,
      this.runtimeConfig.mobileUrl()
        ? build({ key: 'app', name: 'App', desc: 'Tu negocio en el celular', icon: 'app', url: this.runtimeConfig.mobileUrl()! })
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
    window.location.href = app.url;
  }
}
