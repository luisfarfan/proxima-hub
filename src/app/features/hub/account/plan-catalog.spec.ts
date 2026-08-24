import { providePlanPage, renderPlanPage } from './plan-page.testing';

/**
 * `GET billing/plans` ya devolvía `features` y `quotas` (`PlanRead`); el hub
 * las tiraba a la basura y por eso la página no podía decir qué se gana al
 * subir. Acá se afirma que llegan intactas y en el orden en que se decide.
 */
describe('Plan — catálogo tipado', () => {
  it('conserva features y quotas tal como vienen del API', async () => {
    const { page } = await renderPlanPage();
    const crece = page.plans().find((p) => p.id === 'crece')!;

    expect(crece.features?.['electronic_invoicing']).toBe(true);
    expect(crece.features?.['crm']).toBe(true);
    expect(crece.quotas?.['max_products']).toBe(5000);
    expect(crece.quotas?.['max_users']).toBe(10);
  });

  it('ordena los planes por precio ascendente', async () => {
    const { page } = await renderPlanPage();
    expect(page.plans().map((p) => p.id)).toEqual(['free', 'emprende', 'crece']);
  });

  it('un plan sin quotas no rompe la página', async () => {
    const { dom, page } = await renderPlanPage({ plans: providePlanPage.plansWithoutQuotas() });

    expect(page.plans().map((p) => p.id)).toEqual(['free', 'emprende']);
    expect(page.plans()[1].quotas).toBeUndefined();
    expect(dom.textContent).toContain('Plan');
  });

  it('si el catálogo cae, la página sigue montando', async () => {
    const { dom, page } = await renderPlanPage({ plans: 'error' });

    expect(page.plans()).toEqual([]);
    expect(dom.textContent).toContain('Plan');
  });
});
