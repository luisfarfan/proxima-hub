import { provideZonelessChangeDetection, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuthService, AuthTokenStorage, BusinessContextService } from '@luisfarfan/auth';
import { of } from 'rxjs';

import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { HubDataCacheService } from '../../../core/services/hub-data-cache.service';
import { SelectBusinessPageComponent } from './select-business-page.component';

/**
 * Elegir comercio tiene dos públicos con datos distintos.
 *
 * El operador de plataforma ve el ecosistema entero y necesita decidir a cuál
 * entrar: para eso está la ficha (`platform/businesses/summary`). El comerciante
 * con dos negocios recibe 403 en ese endpoint, así que la pantalla NO puede
 * depender de la ficha para funcionar.
 */

const MEMBRESIAS = [
  { id: 'biz-1', name: 'LuchoEcommerce', slug: 'luchoecommerce' },
  { id: 'biz-2', name: 'Botica Vida', slug: 'botica-vida' },
  { id: 'biz-3', name: 'Moda Andina', slug: 'moda-andina' },
];

const ficha = (over: Record<string, unknown> = {}) => ({
  id: 'biz-1',
  plan_name: 'Lidera',
  has_website: true,
  website_published: true,
  website_domain: 'luchoecommerce.pe',
  order_count_30d: 142,
  revenue_30d: 12400,
  created_at: new Date(Date.now() - 240 * 86_400_000).toISOString(),
  is_active: true,
  ...over,
});

interface Options {
  superAdmin?: boolean;
  membresias?: typeof MEMBRESIAS;
  fichas?: Array<ReturnType<typeof ficha>>;
}

async function render(options: Options = {}) {
  const superAdmin = options.superAdmin ?? true;
  const membresias = options.membresias ?? MEMBRESIAS;
  const index = new Map((options.fichas ?? []).map((f) => [f.id as string, f]));

  await TestBed.configureTestingModule({
    imports: [SelectBusinessPageComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      {
        provide: HubDataCacheService,
        useValue: { getMerchantSummaries: async () => index },
      },
      {
        provide: AuthService as unknown as Type<unknown>,
        useValue: {
          user: () => ({ full_name: 'Luis', is_super_admin: superAdmin }),
          memberships: () => membresias,
          getMemberships: () => of(membresias),
          ensureUserLoaded: () => of({}),
        },
      },
      {
        provide: BusinessContextService as unknown as Type<unknown>,
        useValue: { applyMembership: () => {}, businessId: () => null },
      },
      {
        provide: AuthTokenStorage as unknown as Type<unknown>,
        useValue: { getAccessToken: () => 'a', getRefreshToken: () => 'r' },
      },
      {
        provide: RuntimeConfigService,
        useValue: { adminUrl: () => 'https://admin.test', requireConfig: () => ({ apiBaseUrl: '' }) },
      },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: { get: () => null } } },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SelectBusinessPageComponent);
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  return { fixture, dom: fixture.nativeElement as HTMLElement };
}

describe('Elegir comercio — la ficha del operador', () => {
  it('el dominio es un enlace que abre la tienda en otra pestaña', async () => {
    const { dom } = await render({ fichas: [ficha()] });

    const link = dom.querySelector('a[href="https://luchoecommerce.pe"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(link.textContent).toContain('luchoecommerce.pe');
  });

  it('un dominio que ya trae protocolo no se duplica', async () => {
    const { dom } = await render({ fichas: [ficha({ website_domain: 'https://ya.viene.pe' })] });

    expect(dom.querySelector('a[href="https://ya.viene.pe"]')).not.toBeNull();
    expect(dom.querySelector('a[href="https://https://ya.viene.pe"]')).toBeNull();
  });

  it('un borrador no es lo mismo que no tener tienda', async () => {
    const { dom } = await render({
      fichas: [
        ficha({ website_published: false }),
        ficha({ id: 'biz-2', has_website: false, website_domain: null }),
      ],
    });

    expect(dom.textContent).toContain('Borrador');
    expect(dom.textContent).toContain('Sin tienda');
  });

  it('sin tienda no hay enlace que abrir', async () => {
    const { dom } = await render({
      fichas: [ficha({ has_website: false, website_domain: null })],
    });

    expect(dom.querySelector('a[target="_blank"]')).toBeNull();
  });

  it('muestra el plan, la actividad y la antigüedad', async () => {
    const { dom } = await render({ fichas: [ficha()] });

    expect(dom.textContent).toContain('Lidera');
    expect(dom.textContent).toContain('142 pedidos');
    expect(dom.textContent).toContain('hace 8 m');
  });

  it('un comercio sin pedidos lo dice, no muestra un cero', async () => {
    const { dom } = await render({ fichas: [ficha({ order_count_30d: 0, revenue_30d: 0 })] });

    expect(dom.textContent).toContain('Sin pedidos');
  });

  it('un solo pedido no se anuncia en plural', async () => {
    const { dom } = await render({ fichas: [ficha({ order_count_30d: 1 })] });
    expect(dom.textContent).toContain('1 pedido');
  });
});

describe('Elegir comercio — cuando la ficha no llega', () => {
  it('un 403 no impide entrar a ningún comercio', async () => {
    // Sin `platform:read` el endpoint responde 403 y el índice llega vacío.
    const { dom } = await render({ fichas: [] });

    // Ojo con el prefijo: `select-business-logout` y `select-business-filter`
    // también empiezan igual. Se comprueban los tres comercios por su slug.
    for (const slug of ['luchoecommerce', 'botica-vida', 'moda-andina']) {
      expect(dom.querySelector('[data-testid="select-business-' + slug + '"]')).not.toBeNull();
    }
  });

  it('las columnas sin dato quedan vacías, no inventadas', async () => {
    const { dom } = await render({ fichas: [] });

    expect(dom.textContent).not.toContain('Sin pedidos');
    expect(dom.textContent).not.toContain('Publicada');
  });
});

describe('Elegir comercio — el comerciante con varios negocios', () => {
  it('ve la lista de siempre, no la tabla del operador', async () => {
    const { dom } = await render({
      superAdmin: false,
      membresias: MEMBRESIAS.slice(0, 2),
    });

    expect(dom.querySelector('ul[aria-label="Negocios"]')).not.toBeNull();
    expect(dom.textContent).toContain('Elige tu negocio');
    expect(dom.textContent).not.toContain('Últimos 30 días');
  });

  it('no se le pide una ficha que su rol no puede leer', async () => {
    let pedida = false;
    await TestBed.configureTestingModule({
      imports: [SelectBusinessPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: HubDataCacheService,
          useValue: {
            getMerchantSummaries: async () => {
              pedida = true;
              return new Map();
            },
          },
        },
        {
          provide: AuthService as unknown as Type<unknown>,
          useValue: {
            user: () => ({ full_name: 'Luis', is_super_admin: false }),
            memberships: () => MEMBRESIAS.slice(0, 2),
            getMemberships: () => of(MEMBRESIAS.slice(0, 2)),
            ensureUserLoaded: () => of({}),
          },
        },
        {
          provide: BusinessContextService as unknown as Type<unknown>,
          useValue: { applyMembership: () => {}, businessId: () => null },
        },
        {
          provide: AuthTokenStorage as unknown as Type<unknown>,
          useValue: { getAccessToken: () => 'a', getRefreshToken: () => 'r' },
        },
        {
          provide: RuntimeConfigService,
          useValue: { adminUrl: () => 'https://admin.test', requireConfig: () => ({ apiBaseUrl: '' }) },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SelectBusinessPageComponent);
    await fixture.whenStable();

    expect(pedida).toBe(false);
  });
});
