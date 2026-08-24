import { renderPlanPage } from './plan-page.testing';

/**
 * El piso de plan del add-on solo lo aplicaba `provision_addon` en el backend:
 * el hub ofrecía «Crear mi tienda» a alguien en Gratis y el rechazo llegaba
 * después. Y `tienda_web` nunca debe empezar por el checkout — `provision_addon`
 * exige el `template_id` del diseño, así que cobrar antes deja al comercio
 * pagando por una tienda que no se puede provisionar.
 */
describe('Plan — add-ons con su piso', () => {
  const addonCard = (dom: HTMLElement, index = 0) =>
    Array.from(dom.querySelectorAll('.addon-card'))[index];

  it('declara precio y plan mínimo de Tienda Web', async () => {
    const { dom, page } = await renderPlanPage();
    const tienda = page.addonCards().find((c) => c.key === 'tienda_web')!;

    expect(tienda.minPlanLabel).toBe('Emprende');
    expect(addonCard(dom).textContent).toContain('Tienda Web');
    expect(addonCard(dom).textContent).toContain('S/ 50 / mes');
  });

  it('en plan Gratis muestra el piso y su botón no navega', async () => {
    const { dom, page, navigations, settle } = await renderPlanPage();
    const tienda = page.addonCards().find((c) => c.key === 'tienda_web')!;

    expect(tienda.locked).toBe(true);
    expect(addonCard(dom).textContent).toContain('Necesita el plan Emprende o superior');
    expect(addonCard(dom).querySelector('button')).toBeNull();

    await page.contractAddon('tienda_web');
    await settle();

    expect(navigations).toEqual([]);
    expect(dom.querySelector('[role="alert"]')?.textContent).toContain('Emprende');
  });

  it('en Emprende abre el asistente de admin y nunca el checkout de add-ons', async () => {
    const { page, navigations, posts } = await renderPlanPage({
      status: {
        plan_id: 'emprende',
        plan_name: 'Emprende',
        status: 'active',
        usage: [{ resource: 'max_products', limit: 500, current: 12 }],
      },
    });

    expect(page.addonCards().find((c) => c.key === 'tienda_web')!.locked).toBe(false);

    await page.contractAddon('tienda_web');

    expect(navigations).toEqual(['https://admin.proxima.test/websites/nueva']);
    expect(posts).toEqual([]);
  });

  it('el total suma el plan vigente y los add-ons activos', async () => {
    const { dom, page } = await renderPlanPage({
      status: {
        plan_id: 'emprende',
        plan_name: 'Emprende',
        status: 'active',
        usage: [{ resource: 'max_products', limit: 500, current: 12 }],
      },
      entitlements: { cms: true },
    });

    expect(page.monthlyTotal()).toBe(100);
    const bar = dom.querySelector('.total-bar')!;
    expect(bar.textContent).toContain('S/ 100');
    expect(bar.textContent).toContain('Emprende S/ 50');
    expect(bar.textContent).toContain('Tienda Web S/ 50');
  });

  it('sin add-ons activos el total es solo el plan', async () => {
    const { dom, page } = await renderPlanPage();

    expect(page.monthlyTotal()).toBe(0);
    expect(dom.querySelector('.total-bar')?.textContent).toContain('sin add-ons');
  });
});
