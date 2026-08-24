import { provideZonelessChangeDetection, type Type } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { BusinessContextService } from '@luisfarfan/auth';

import { RuntimeConfigService } from '../../../core/config/runtime-config.service';

import { PlanPageComponent } from './plan-page.component';

/**
 * Andamio de `/plan`. La página lee tres endpoints por `resource()`; acá se
 * responden con datos calcados del API real (`PLAN_LADDER`), porque toda la
 * lógica nueva —lo que se desbloquea, los saltos de cuota, el plan sugerido—
 * se calcula a partir de esas cifras. Un fixture inventado probaría otra cosa.
 */

export const PLANS_FAKE = [
  {
    id: 'free',
    name: 'Gratis',
    monthly_price: 0,
    description: 'Catálogo, control de stock y ventas manuales, sin límite de tiempo.',
    features: {
      catalog: true,
      stock: true,
      manual_sales: true,
      orders: true,
      whatsapp_checkout: false,
      analytics: false,
      crm: false,
      electronic_invoicing: false,
    },
    quotas: { max_products: 10, max_users: 1, orders_per_month: 30, invoices_per_month: 0 },
  },
  {
    id: 'emprende',
    name: 'Emprende',
    monthly_price: 50,
    description: 'Catálogo, pedidos por WhatsApp, stock y analítica básica.',
    features: {
      catalog: true,
      stock: true,
      manual_sales: true,
      orders: true,
      whatsapp_checkout: true,
      analytics: true,
      crm: false,
      electronic_invoicing: false,
    },
    quotas: { max_products: 500, max_users: 3, orders_per_month: 300 },
  },
  {
    id: 'crece',
    name: 'Crece',
    monthly_price: 99,
    description: 'Todo Emprende más CRM y facturación electrónica SUNAT.',
    features: {
      catalog: true,
      stock: true,
      manual_sales: true,
      orders: true,
      whatsapp_checkout: true,
      analytics: true,
      crm: true,
      electronic_invoicing: true,
    },
    quotas: { max_products: 5000, max_users: 10, orders_per_month: 2000, invoices_per_month: 500 },
  },
];

export const STATUS_FAKE = {
  plan_id: 'free',
  plan_name: 'Gratis',
  status: 'trial',
  usage: [
    { resource: 'max_products', limit: 10, current: 9 },
    { resource: 'max_users', limit: 1, current: 1 },
    { resource: 'orders_per_month', limit: 30, current: 12 },
  ],
};

export const providePlanPage = {
  plansWithoutQuotas() {
    return [
      { id: 'free', name: 'Gratis', monthly_price: 0, features: { catalog: true } },
      { id: 'emprende', name: 'Emprende', monthly_price: 50, features: { catalog: true, analytics: true } },
    ];
  },
};

export interface RenderOptions {
  plans?: unknown[] | 'error';
  status?: unknown | 'error';
  entitlements?: Record<string, boolean>;
  adminUrl?: string | null;
}

export async function renderPlanPage(options: RenderOptions = {}) {
  const plans = options.plans ?? PLANS_FAKE;
  const status = options.status ?? STATUS_FAKE;
  const navigations: string[] = [];
  const posts: string[] = [];

  const http = {
    get: (url: string): Observable<unknown> => {
      if (url.includes('billing/plans')) {
        return plans === 'error' ? throwError(() => new Error('planes caídos')) : of(plans);
      }
      if (url.includes('subscription/status')) {
        return status === 'error' ? throwError(() => new Error('status caído')) : of(status);
      }
      if (url.includes('subscription/payments')) return of([]);
      return of(null);
    },
    post: (url: string) => {
      posts.push(url);
      return of({});
    },
  };

  const businessCtx = {
    entitlements: () => options.entitlements ?? {},
    businessId: () => 1,
  };

  await TestBed.configureTestingModule({
    imports: [PlanPageComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: HttpClient, useValue: http },
      { provide: BusinessContextService as unknown as Type<unknown>, useValue: businessCtx },
      {
        provide: RuntimeConfigService,
        useValue: {
          builderUrl: () => 'https://builder.proxima.test',
          intelligenceUrl: () => 'https://intelligence.proxima.test',
          adminUrl: () => (options.adminUrl === undefined ? 'https://admin.proxima.test' : options.adminUrl),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(PlanPageComponent);
  // El componente navega asignando `location.href`; jsdom no puede. Se observa.
  (fixture.componentInstance as unknown as { navigateTo(url: string): void }).navigateTo = (url) => {
    navigations.push(url);
  };
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();

  return {
    fixture,
    navigations,
    posts,
    dom: fixture.nativeElement as HTMLElement,
    page: fixture.componentInstance as unknown as {
      plans(): { id: string; monthly_price: number; features?: Record<string, boolean>; quotas?: Record<string, number> }[];
      planCards(): unknown[];
      usageRows(): { key: string; pct: number; alert: boolean; remaining: number }[];
      suggestedPlanId(): string | null;
      monthlyTotal(): number;
      addonCards(): { key: string; locked: boolean; active: boolean; minPlanLabel: string }[];
      monthlyTotal(): number;
      contractAddon(key: string): Promise<void>;
    },
    async settle() {
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
    },
  };
}
