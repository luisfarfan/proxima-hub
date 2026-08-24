import { provideZonelessChangeDetection, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService, AuthTokenStorage, BusinessContextService } from '@luisfarfan/auth';

import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { HubDataCacheService } from '../../../core/services/hub-data-cache.service';
import { HomeComponent } from './home.component';

/**
 * Lo que esta pantalla tiene que dejar claro de un vistazo: qué es tuyo, qué
 * no lo es, y qué exactamente abre lo que no lo es. Antes las cuatro tarjetas
 * eran idénticas salvo una etiqueta gris de 10 px, y «Caja» decía «Add-on»
 * cuando en realidad sale recién con el plan Lidera de S/ 249.
 */

const PLANS = [
  { id: 'free', name: 'Gratis', monthly_price: 0, features: { catalog: true } },
  { id: 'emprende', name: 'Emprende', monthly_price: 50, features: { catalog: true, whatsapp_checkout: true } },
  { id: 'lidera', name: 'Lidera', monthly_price: 249, features: { catalog: true, pos: true } },
];

const CHECKLIST = [
  { id: 'catalog.has_products', complete: false, skipped: false, blocking: true, cta_label: 'Agregar productos' },
  { id: 'store.payment_methods', complete: false, skipped: false, blocking: true, cta_label: 'Configurar métodos de pago' },
  { id: 'store.store_name', complete: false, skipped: false, blocking: false, cta_label: 'Configurar nombre de tienda' },
];

interface Options {
  entitlements?: Record<string, boolean>;
  checklist?: typeof CHECKLIST;
}

async function render(options: Options = {}) {
  const hubData = {
    getPlans: async () => PLANS,
    getSubscriptionStatus: async () => ({
      plan_name: 'Gratis',
      status: 'active',
      usage: [{ resource: 'max_products', limit: 10, current: 0, unit: 'u' }],
    }),
    getBusinessStatus: async () => ({
      readiness: {
        sections: [{ items: options.checklist ?? CHECKLIST }],
        progress: { completed: 0, total: (options.checklist ?? CHECKLIST).length, percentage: 0 },
      },
    }),
  };

  await TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: HubDataCacheService, useValue: hubData },
      {
        provide: BusinessContextService as unknown as Type<unknown>,
        useValue: {
          entitlements: () => options.entitlements ?? { catalog: true, stock: true },
          businessId: () => 'biz-1',
          activeBusiness: () => ({ name: 'LuchoEcommerce' }),
        },
      },
      {
        provide: AuthService as unknown as Type<unknown>,
        useValue: { user: () => ({ full_name: 'Luis Farfán', permissions: ['*'] }), memberships: () => [] },
      },
      {
        provide: AuthTokenStorage as unknown as Type<unknown>,
        useValue: { getAccessToken: () => 'a', getRefreshToken: () => 'r' },
      },
      {
        provide: RuntimeConfigService,
        useValue: {
          adminUrl: () => 'https://admin.test',
          posUrl: () => 'https://pos.test',
          builderUrl: () => 'https://builder.test',
          intelligenceUrl: () => 'https://intelligence.test',
          mobileUrl: () => null,
          appVersion: () => '0.1.0',
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(HomeComponent);
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, dom: fixture.nativeElement as HTMLElement };
}

describe('Hub home — lo tuyo y lo que falta', () => {
  it('separa lo incluido de lo bloqueado en dos estantes distintos', async () => {
    const { dom } = await render();

    const owned = Array.from(dom.querySelectorAll('.hub-open-name')).map((n) => n.textContent?.trim());
    const locked = Array.from(dom.querySelectorAll('.hub-lock-name')).map((n) => n.textContent?.trim());

    expect(owned).toEqual(['Panel']);
    expect(locked).toEqual(['Caja', 'Tienda Web', 'Intelligence']);
  });

  it('dice que Caja viene con un PLAN, no con un add-on', async () => {
    const { dom } = await render();
    const caja = Array.from(dom.querySelectorAll('.hub-lock')).find((el) =>
      el.querySelector('.hub-lock-name')?.textContent?.includes('Caja'),
    )!;

    expect(caja.querySelector('.hub-lock-detail')?.textContent).toContain('desde el plan Lidera');
    expect(caja.querySelector('.hub-lock-detail')?.textContent).not.toContain('Add-on');
    expect(caja.querySelector('.hub-lock-price b')?.textContent?.trim()).toBe('Lidera');
    expect(caja.querySelector('.hub-lock-price span')?.textContent?.trim()).toBe('S/ 249 al mes');
  });

  it('dice el precio del add-on y su plan mínimo', async () => {
    const { dom } = await render();
    const tienda = Array.from(dom.querySelectorAll('.hub-lock')).find((el) =>
      el.querySelector('.hub-lock-name')?.textContent?.includes('Tienda Web'),
    )!;

    expect(tienda.querySelector('.hub-lock-detail')?.textContent).toContain('S/ 50 al mes');
    expect(tienda.querySelector('.hub-lock-detail')?.textContent).toContain('plan Emprende');
    expect(tienda.querySelector('.hub-lock-price b')?.textContent?.trim()).toBe('+ S/ 50');
  });

  it('cuando el plan incluye todo, no hay estante de bloqueados', async () => {
    const { dom } = await render({
      entitlements: { catalog: true, pos: true, cms: true, pricing_intelligence: true },
    });

    expect(dom.querySelectorAll('.hub-lock').length).toBe(0);
    expect(Array.from(dom.querySelectorAll('.hub-open-name')).map((n) => n.textContent?.trim())).toContain('Caja');
  });

  it('marca el paso que toca y lo nombra arriba', async () => {
    const { dom } = await render();

    const next = dom.querySelector('.hub-check.is-next')!;
    expect(next.textContent).toContain('Agregar productos');
    expect(next.querySelector('.hub-check-go')?.textContent?.trim()).toBe('Empezar');
    expect(dom.querySelector('.hub-pulse')?.textContent).toContain('agregar productos');
  });

  it('sin productos no ofrece salir en vivo', async () => {
    const { dom } = await render();

    expect(dom.querySelector('.hub-golive')).toBeNull();
    expect(dom.querySelector('.hub-compare')?.textContent?.trim()).toBe('Comparar planes');
    expect(dom.textContent).toContain('cuando tengas tu primer producto');
  });

  it('con el catálogo cargado sí ofrece salir en vivo', async () => {
    const { dom } = await render({
      checklist: [{ ...CHECKLIST[0], complete: true }, CHECKLIST[1], CHECKLIST[2]],
    });

    expect(dom.querySelector('.hub-golive')?.textContent).toContain('Salir en vivo');
    expect(dom.querySelector('.hub-compare')).toBeNull();
  });

  it('explica por qué la checklist es más corta de lo que era', async () => {
    const { dom } = await render();
    expect(dom.querySelector('.hub-check-note')?.textContent).toContain('que tu plan permite completar');
  });
});
