import { renderPlanPage } from './plan-page.testing';

/**
 * Antes cada plan era una fila con su `description`: el usuario tenía que
 * deducir qué gana comparando dos párrafos de marketing. Ahora la diferencia
 * se calcula contra su plan actual, así que no puede quedar desalineada del
 * API el día que una feature cambie de escalón.
 */
describe('Plan — tarjetas con la diferencia', () => {
  const cards = (dom: HTMLElement) => Array.from(dom.querySelectorAll('.plan-card'));

  it('lista solo lo que el plan actual no tiene', async () => {
    const { dom } = await renderPlanPage();
    const emprende = cards(dom)[1];
    const gains = Array.from(emprende.querySelectorAll('.plan-gain')).map((g) =>
      g.textContent?.trim(),
    );

    expect(gains).toContain('Pedidos por WhatsApp');
    expect(gains).toContain('Analítica de tus ventas');
    // Catálogo y stock ya los tiene el plan Gratis: no son una ganancia.
    expect(gains).not.toContain('Catálogo de productos');
    expect(gains).not.toContain('Control de stock');
  });

  it('muestra los saltos de cuota con los números del API', async () => {
    const { dom } = await renderPlanPage();
    const jumps = Array.from(cards(dom)[1].querySelectorAll('.plan-jump')).map((j) => {
      const [from, to] = Array.from(j.querySelectorAll('b')).map((b) => b.textContent?.trim());
      return { label: j.firstChild?.textContent?.trim(), from, to };
    });

    expect(jumps).toContainEqual({ label: 'Productos', from: '10', to: '500' });
    expect(jumps).toContainEqual({ label: 'Usuarios', from: '1', to: '3' });
    expect(jumps).toContainEqual({ label: 'Pedidos / mes', from: '30', to: '300' });
  });

  it('el plan actual se marca y no ofrece botón de cambio', async () => {
    const { dom } = await renderPlanPage();
    const gratis = cards(dom)[0];

    expect(gratis.classList.contains('is-current')).toBe(true);
    expect(gratis.querySelector('.plan-tag')?.textContent?.trim()).toBe('Tu plan de hoy');
    expect(gratis.querySelector('button')).toBeNull();
  });

  it('lo que el plan actual incluye se muestra como incluido, no como ausente', async () => {
    const { dom } = await renderPlanPage();
    const gratis = cards(dom)[0];
    const items = Array.from(gratis.querySelectorAll('.plan-gain'));

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.classList.contains('is-have'))).toBe(true);
    expect(gratis.textContent).toContain('Catálogo de productos');
  });

  it('los planes superiores ofrecen su cambio', async () => {
    const { dom } = await renderPlanPage();

    expect(cards(dom)[1].querySelector('button')?.textContent).toContain('Cambiar a Emprende');
    expect(cards(dom)[2].querySelector('button')?.textContent).toContain('Cambiar a Crece');
  });

});
