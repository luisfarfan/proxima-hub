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
  signals?: { pendingOrders: number | null; revenueToday: number | null };
  /** Códigos efectivos del usuario en el negocio activo; ausente = la API no los mandó. */
  permissions?: string[];
  usage?: Array<{ resource: string; limit: number; current: number; unit: string }>;
}

async function render(options: Options = {}) {
  const hubData = {
    getPlans: async () => PLANS,
    getSubscriptionStatus: async () => ({
      plan_name: 'Gratis',
      status: 'active',
      usage: options.usage ?? [{ resource: 'max_products', limit: 10, current: 0, unit: 'u' }],
    }),
    getAppSignals: async () =>
      options.signals ?? { pendingOrders: null, revenueToday: null },
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
        useValue: {
          user: () => ({
            full_name: 'Luis Farfán',
            permissions: ['*'],
            ...(options.permissions ? { active_business: { permissions: options.permissions } } : {}),
          }),
          memberships: () => [],
        },
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

/** Panel es la pieza ancha; el resto va en la grilla. Los nombres viven en dos clases. */
function ownedNames(dom: HTMLElement): (string | undefined)[] {
  return Array.from(dom.querySelectorAll('.hub-lead-name, .hub-app-name')).map((n) =>
    n.textContent?.trim(),
  );
}

describe('Hub home — lo tuyo y lo que falta', () => {
  it('separa lo incluido de lo bloqueado en dos estantes distintos', async () => {
    const { dom } = await render();

    const owned = ownedNames(dom);
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
    expect(ownedNames(dom)).toContain('Caja');
  });

  it('marca el paso que toca y lo nombra arriba', async () => {
    const { dom } = await render();

    const next = dom.querySelector('.hub-check.is-next')!;
    expect(next.textContent).toContain('Agregar productos');
    expect(next.querySelector('.hub-check-go')?.textContent?.trim()).toBe('Empezar');
    expect(dom.querySelector('.hub-next-label')?.textContent?.trim()).toBe('Agregar productos');
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

/**
 * Las señales de cada app son de fondo: llegan tarde, pueden no llegar, y no
 * pueden impedir que el comercio entre a su negocio.
 *
 * `null` no es cero. Un empleado de mostrador no tiene `fulfillment:manage` y
 * la API le responde 403 — pintarle «0 pedidos sin atender» sería decirle que
 * no hay trabajo cuando lo que pasa es que no se le permite verlo.
 */
describe('Hub home — por qué abrir cada app', () => {
  it('sin señales la tarjeta se pinta igual, sólo sin números', async () => {
    const { dom } = await render();

    expect(dom.querySelector('.hub-lead-name')?.textContent?.trim()).toBe('Panel');
    expect(dom.querySelectorAll('.hub-stat').length).toBe(0);
  });

  it('con señales pone el número y su unidad', async () => {
    const { dom } = await render({ signals: { pendingOrders: 12, revenueToday: 4820 } });

    const stats = Array.from(dom.querySelectorAll('.hub-stat')).map((s) => s.textContent);
    expect(stats.length).toBe(2);
    expect(stats[0]).toContain('12');
    expect(stats[0]).toContain('pedidos sin atender');
    expect(stats[1]).toContain('vendido hoy');
  });

  it('un 403 en una señal no se lleva la otra', async () => {
    const { dom } = await render({ signals: { pendingOrders: null, revenueToday: 900 } });

    const stats = Array.from(dom.querySelectorAll('.hub-stat')).map((s) => s.textContent);
    expect(stats.length).toBe(1);
    expect(stats[0]).toContain('vendido hoy');
  });

  it('un pedido no se anuncia en plural', async () => {
    const { dom } = await render({ signals: { pendingOrders: 1, revenueToday: null } });
    expect(dom.querySelector('.hub-stat')?.textContent).toContain('pedido sin atender');
  });

  it('cero pedidos es un dato, no una ausencia: se muestra', async () => {
    const { dom } = await render({ signals: { pendingOrders: 0, revenueToday: null } });
    expect(dom.querySelector('.hub-stat b')?.textContent?.trim()).toBe('0');
  });
});

/**
 * El API manda -1 por «sin tope» y la tarjeta lo imprimía crudo:
 * «Almacenamiento 0 / -1». Además `usagePct` devolvía -400% para la barra.
 */
describe('Hub home — el plan sin tope', () => {
  it('-1 se lee Ilimitado, no menos uno', async () => {
    const { dom } = await render({
      usage: [{ resource: 'storage_mb', limit: -1, current: 0, unit: 'MB' }],
    });

    const row = dom.querySelector('.hub-usage-row b')?.textContent ?? '';
    expect(row).toContain('Ilimitado');
    expect(row).not.toContain('-1');
  });

  it('sin tope la barra no dibuja una fracción negativa', async () => {
    const { dom } = await render({
      usage: [{ resource: 'storage_mb', limit: -1, current: 40, unit: 'MB' }],
    });

    const bar = dom.querySelector('.hub-usage-bar span') as HTMLElement;
    expect(bar.style.width).toBe('100%');
    expect(bar.classList).toContain('is-unlimited');
  });

  it('con tope real sigue siendo un porcentaje', async () => {
    const { dom } = await render({
      usage: [{ resource: 'max_products', limit: 10, current: 5, unit: 'u' }],
    });

    expect((dom.querySelector('.hub-usage-bar span') as HTMLElement).style.width).toBe('50%');
  });
});

/**
 * PPR-112 esconde el checklist y el plan a quien no administra el negocio.
 * La API manda ['*'] para el super admin, no la lista de códigos: sin
 * contemplar el comodín, a quien puede todo se le escondía medio centro.
 */
describe('Hub home — quién ve la configuración del negocio', () => {
  it('el comodín del super admin cuenta como administrar', async () => {
    const { dom } = await render({ permissions: ['*'] });

    expect(dom.querySelector('.hub-grid2')).not.toBeNull();
    expect(dom.querySelector('.hub-checklist')).not.toBeNull();
    expect(dom.querySelector('.hub-plan-name')).not.toBeNull();
  });

  it('quien administra con el permiso explícito también lo ve', async () => {
    const { dom } = await render({ permissions: ['settings:manage'] });
    expect(dom.querySelector('.hub-grid2')).not.toBeNull();
  });

  it('un rol de mostrador no ve tareas que no puede hacer', async () => {
    const { dom } = await render({ permissions: ['orders:view'] });

    expect(dom.querySelector('.hub-grid2')).toBeNull();
    expect(dom.querySelector('.hub-next')).toBeNull();
  });

  it('si la API no manda permisos, no se esconde nada', async () => {
    const { dom } = await render();
    expect(dom.querySelector('.hub-grid2')).not.toBeNull();
  });
});
