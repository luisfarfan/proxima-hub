import { provideZonelessChangeDetection, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService, BusinessContextService } from '@luisfarfan/auth';

import { HubDataCacheService } from '../../../core/services/hub-data-cache.service';
import { AccountShellComponent } from './account-shell.component';

/**
 * Las cuatro pestañas planas mezclaban dos sujetos: Cuenta y Seguridad son
 * sobre la persona —ninguna menciona un negocio jamás— y Plan y Equipo sobre
 * el negocio. Encima repetían exactamente los cuatro ítems del menú del
 * avatar. El rail los separa y le pone cara a cada grupo.
 */
async function render() {
  const hubData = {
    getSubscriptionStatus: async () => ({
      plan_name: 'Emprende — Catálogo, pedidos y control de stock',
      status: 'active',
      usage: [],
    }),
    getBusinessStatus: async () => null,
    getPlans: async () => [],
  };

  await TestBed.configureTestingModule({
    imports: [AccountShellComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: HubDataCacheService, useValue: hubData },
      {
        provide: BusinessContextService as unknown as Type<unknown>,
        useValue: { businessId: () => 'biz-1' },
      },
      {
        provide: AuthService as unknown as Type<unknown>,
        useValue: {
          user: () => ({ full_name: 'Luis Farfán', email: 'lucho@proxima.pe' }),
          memberships: () => [{ id: 'biz-1', name: 'LuchoEcommerce' }],
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AccountShellComponent);
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, dom: fixture.nativeElement as HTMLElement };
}

describe('Cuenta — dos grupos con dueño', () => {
  const groups = (dom: HTMLElement) => Array.from(dom.querySelectorAll('.rail-group'));

  it('separa lo del negocio de lo tuyo, y lo dice', async () => {
    const { dom } = await render();
    const [biz, you] = groups(dom);

    expect(biz.querySelector('.rail-group-h')?.textContent?.trim()).toBe('Este negocio');
    expect(you.querySelector('.rail-group-h')?.textContent?.trim()).toBe('Tu cuenta');
  });

  it('cada grupo lleva la cara de quién manda en él', async () => {
    const { dom } = await render();
    const [biz, you] = groups(dom);

    expect(biz.querySelector('.rail-who-name')?.textContent?.trim()).toBe('LuchoEcommerce');
    expect(biz.querySelector('.rail-who-sub')?.textContent?.trim()).toBe('Emprende');
    expect(you.querySelector('.rail-who-name')?.textContent?.trim()).toBe('Luis Farfán');
    expect(you.querySelector('.rail-who-sub')?.textContent?.trim()).toBe('lucho@proxima.pe');
  });

  it('los destinos del negocio y los tuyos no se mezclan', async () => {
    const { dom } = await render();
    const [biz, you] = groups(dom);
    const labels = (el: Element) =>
      Array.from(el.querySelectorAll('.rail-links a')).map((a) => a.textContent?.trim());

    expect(labels(biz)).toEqual(['Plan y facturación', 'Equipo']);
    expect(labels(you)).toEqual(['Perfil', 'Acceso y seguridad']);
  });

  it('advierte qué cambia al cambiar de negocio', async () => {
    const { dom } = await render();
    expect(dom.querySelector('.rail-note')?.textContent).toContain('solo lo del primer grupo');
  });

  it('el plan largo del API no desborda la etiqueta del grupo', async () => {
    const { dom } = await render();
    // `PlanRead.name` trae la descripción pegada tras el guión largo.
    expect(dom.querySelector('.rail-who-sub')?.textContent).not.toContain('Catálogo');
  });
});
