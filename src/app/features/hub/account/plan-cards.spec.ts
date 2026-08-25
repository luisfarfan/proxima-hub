import { PLANS_FAKE, STATUS_FAKE, renderPlanPage } from './plan-page.testing';

/**
 * La escalera. Antes eran tres tarjetas sueltas y los dos planes asistidos
 * —Despega y Lidera— no aparecían en ninguna parte, aunque son la mitad del
 * catálogo. Acá se afirma que el mapa está completo y que cada peldaño se
 * calcula contra el plan vigente, no contra una lista escrita a mano.
 */
describe('Plan — la escalera', () => {
  const rungs = (dom: HTMLElement) => Array.from(dom.querySelectorAll('.rung'));

  it('muestra un peldaño por plan del catálogo, en orden de precio', async () => {
    const { dom } = await renderPlanPage();

    expect(rungs(dom).map((r) => r.querySelector('.rung-name')?.textContent?.trim())).toEqual([
      'Gratis',
      'Emprende',
      'Crece',
    ]);
  });

  it('marca dónde estás y no permite confundirlo con otro peldaño', async () => {
    const { dom } = await renderPlanPage();
    const [gratis] = rungs(dom);

    expect(gratis.classList.contains('is-now')).toBe(true);
    expect(gratis.querySelector('.rung-flag')?.textContent?.trim()).toBe('Estás aquí');
    expect(rungs(dom)[1].classList.contains('is-now')).toBe(false);
  });

  it('cada peldaño anuncia lo primero que agrega sobre el anterior', async () => {
    const { dom } = await renderPlanPage();
    const headlines = rungs(dom).map((r) => r.querySelector('.rung-headline')?.textContent?.trim());

    // Calculado restando features, no escrito a mano.
    expect(headlines[1]).toBe('+ Pedidos por WhatsApp');
    expect(headlines[2]).toBe('+ CRM de clientes');
  });

  it('el alto del peldaño crece con el precio', async () => {
    const { dom } = await renderPlanPage();
    const heights = Array.from(dom.querySelectorAll<HTMLElement>('.rung-slot')).map((slot) =>
      parseInt(slot.style.height, 10),
    );

    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
  });

  it('se abre en el peldaño siguiente al actual: la pregunta que trae acá', async () => {
    const { dom } = await renderPlanPage();

    expect(dom.querySelector('.step-detail')?.textContent).toContain('De Gratis a Emprende');
    expect(dom.querySelector('.step-delta')?.textContent?.trim()).toBe('S/ 50 más al mes');
  });

  it('el detalle acumula todo lo que ganas desde donde estás', async () => {
    const { dom, settle } = await renderPlanPage();

    // Saltar dos peldaños: lo de Emprende Y lo de Crece.
    dom.querySelectorAll<HTMLButtonElement>('.rung')[2].click();
    await settle();

    const gains = Array.from(dom.querySelectorAll('.step-gain')).map((g) => g.textContent?.trim());
    expect(gains).toContain('Pedidos por WhatsApp');
    expect(gains).toContain('CRM de clientes');
    expect(dom.querySelector('.step-delta')?.textContent?.trim()).toBe('S/ 99 más al mes');
  });

  it('muestra los saltos de cuota con los números del API', async () => {
    const { dom } = await renderPlanPage();
    const jumps = Array.from(dom.querySelectorAll('.step-jump')).map((j) => {
      const [from, to] = Array.from(j.querySelectorAll('b')).map((b) => b.textContent?.trim());
      return { label: j.firstChild?.textContent?.trim(), from, to };
    });

    expect(jumps).toContainEqual({ label: 'Productos', from: '10', to: '500' });
    expect(jumps).toContainEqual({ label: 'Usuarios', from: '1', to: '3' });
  });

  it('una cuota que el plan vigente no declara no revienta la página', async () => {
    const { dom, settle } = await renderPlanPage();

    // Crece declara `invoices_per_month`; Gratis del fixture no lo trae.
    dom.querySelectorAll<HTMLButtonElement>('.rung')[2].click();
    await settle();

    const jumps = Array.from(dom.querySelectorAll('.step-jump')).map((j) => j.textContent);
    expect(jumps.length).toBeGreaterThan(0);
    expect(dom.textContent).not.toContain('undefined');
  });

  it('en tu propio peldaño lista lo que ya tienes, no lo que ganarías', async () => {
    const { dom, settle } = await renderPlanPage();

    dom.querySelectorAll<HTMLButtonElement>('.rung')[0].click();
    await settle();

    expect(dom.querySelector('.step-detail')?.textContent).toContain('Lo que ya tienes con Gratis');
    const gains = Array.from(dom.querySelectorAll('.step-gain')).map((g) => g.textContent?.trim());
    expect(gains).toContain('Catálogo de productos');
    expect(dom.querySelector('.step-cta')).toBeNull();
  });

  it('un plan gratuito vigente no ofrece cancelar: no hay nada que cancelar', async () => {
    const { dom, settle } = await renderPlanPage({ status: { ...STATUS_FAKE, status: 'active' } });

    dom.querySelectorAll<HTMLButtonElement>('.rung')[0].click();
    await settle();

    expect(dom.querySelector('.btn-danger-sm')).toBeNull();
    expect(dom.querySelector('.step-how-text')?.textContent).toContain('no vence');
  });

  it('un plan pagado vigente ofrece cancelar desde su propio peldaño', async () => {
    const { dom, settle } = await renderPlanPage({
      status: { ...STATUS_FAKE, plan_id: 'emprende', plan_name: 'Emprende', status: 'active' },
    });

    dom.querySelectorAll<HTMLButtonElement>('.rung')[1].click();
    await settle();

    expect(dom.querySelector('.btn-danger-sm')?.textContent?.trim()).toBe('Cancelar suscripción');
  });

  it('un plan asistido no ofrece checkout: manda a hablar con el equipo', async () => {
    const { dom, settle } = await renderPlanPage({
      plans: [
        ...PLANS_FAKE,
        {
          id: 'lidera',
          name: 'Lidera — Inventario, almacenes y POS',
          monthly_price: 249,
          features: { catalog: true, pos: true },
          quotas: { max_products: 50000 },
        },
      ],
    });

    const lidera = rungs(dom)[3];
    expect(lidera.classList.contains('is-assisted')).toBe(true);
    expect(lidera.querySelector('.rung-flag')?.textContent?.trim()).toBe('Asistido');

    dom.querySelectorAll<HTMLButtonElement>('.rung')[3].click();
    await settle();

    const cta = dom.querySelector('.step-cta')!;
    expect(cta.textContent?.trim()).toBe('Hablar con el equipo');
    expect(cta.getAttribute('href')).toContain('mailto:');
    expect(dom.querySelector('.step-how-text')?.textContent).toContain('con nuestro equipo');
  });

  it('un peldaño por debajo del actual ofrece bajar, no subir', async () => {
    const { dom, settle } = await renderPlanPage({
      status: { ...STATUS_FAKE, plan_id: 'crece', plan_name: 'Crece', status: 'active' },
    });

    dom.querySelectorAll<HTMLButtonElement>('.rung')[1].click();
    await settle();

    expect(dom.querySelector('.step-cta')?.textContent).toContain('Bajar a Emprende');
    expect(dom.querySelector('.step-delta')?.textContent?.trim()).toBe('S/ 49 menos al mes');
  });

  it('el peldaño no arrastra la descripción larga del plan', async () => {
    const { dom } = await renderPlanPage();

    expect(rungs(dom)[1].querySelector('.rung-name')?.textContent?.trim()).toBe('Emprende');
    expect(rungs(dom)[1].textContent).not.toContain('Catálogo, pedidos');
  });
});
