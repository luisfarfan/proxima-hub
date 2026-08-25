import { PLANS_FAKE, STATUS_FAKE, renderPlanPage } from './plan-page.testing';

/**
 * El uso ya se mostraba, pero suelto: tres barras que no llevaban a ninguna
 * decisión. Acá el uso es lo que abre el caso — y cuando ningún plan resuelve
 * lo que está en alerta, la página lo dice en vez de empujar cualquier cosa.
 */
describe('Plan — el uso decide', () => {
  const meters = (dom: HTMLElement) => Array.from(dom.querySelectorAll('.usage-meter'));

  it('muestra cada recurso con su porcentaje de consumo', async () => {
    const { dom } = await renderPlanPage();
    const bars = meters(dom).map((m) => ({
      label: m.querySelector('.usage-meter-head span')?.textContent?.trim(),
      now: m.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'),
    }));

    expect(bars).toContainEqual({ label: 'Productos', now: '90' });
    expect(bars).toContainEqual({ label: 'Usuarios', now: '100' });
    expect(bars).toContainEqual({ label: 'Pedidos / mes', now: '40' });
  });

  it('una cuota al 80 % o más se marca en alerta y dice cuánto queda', async () => {
    const { dom } = await renderPlanPage();

    const alertBars = dom.querySelectorAll('.usage-meter-bar > span.is-alert');
    expect(alertBars.length).toBe(2); // productos (90 %) y usuarios (100 %)

    const claim = dom.querySelector('.usage-claim')!.textContent!.replace(/\s+/g, ' ');
    expect(claim).toContain('1 de 10');
    expect(claim).toContain('productos');
    expect(claim).toContain('Llegaste al tope de');
  });

  it('sugiere el plan más barato que supera todo lo que está en alerta', async () => {
    const { dom, page } = await renderPlanPage();

    expect(page.suggestedPlanId()).toBe('emprende');
    expect(dom.querySelector('.usage-suggestion')?.textContent).toContain('Emprende');
  });

  it('si ningún plan supera las cuotas en alerta, no inventa una recomendación', async () => {
    // Un negocio ya en Crece contra un tope que ningún plan superior levanta.
    const { dom, page } = await renderPlanPage({
      status: {
        ...STATUS_FAKE,
        plan_id: 'crece',
        plan_name: 'Crece',
        usage: [{ resource: 'max_products', limit: 5000, current: 4900 }],
      },
      plans: PLANS_FAKE,
    });

    expect(page.suggestedPlanId()).toBeNull();
    expect(dom.querySelector('.usage-suggestion')?.textContent).toContain(
      'no te proponemos ninguno',
    );
  });

  it('sin cuotas en alerta no hay recomendación, y lo dice', async () => {
    const { dom, page } = await renderPlanPage({
      status: {
        ...STATUS_FAKE,
        usage: [{ resource: 'max_products', limit: 10, current: 2 }],
      },
    });

    expect(page.suggestedPlanId()).toBeNull();
    expect(dom.querySelector('.usage-claim')?.textContent).toContain('holgado');
  });

  it('si el estado de suscripción cae, la franja no se renderiza y la página sigue', async () => {
    const { dom } = await renderPlanPage({ status: 'error' });

    expect(dom.querySelector('.usage-strip')).toBeNull();
    expect(dom.querySelectorAll('.rung').length).toBe(3);
  });
});
