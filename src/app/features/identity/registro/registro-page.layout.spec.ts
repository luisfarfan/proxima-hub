import { setupRegistroPage } from './registro-page.testing';

/**
 * El paso 1 dejó de ser una columna sola en medio de la pantalla: ahora el
 * formulario va acompañado del panel que arma el negocio, y el progreso tiene
 * hitos con nombre. Lo que NO debe cambiar es la accesibilidad que ya existía
 * —foco en el encabezado y `progressbar` con su valor— así que se afirma acá.
 */
describe('Registro — layout de dos columnas', () => {
  it('el paso 1 muestra el formulario y el panel al mismo tiempo', async () => {
    const { dom } = await setupRegistroPage();

    expect(dom.querySelector('.reg-left')).toBeTruthy();
    expect(dom.querySelector('form')).toBeTruthy();
    expect(dom.querySelector('app-registro-live-panel')).toBeTruthy();
  });

  it('el riel nombra los tres hitos y marca el actual', async () => {
    const { dom } = await setupRegistroPage();
    const items = Array.from(dom.querySelectorAll('.reg-rail-item'));

    expect(items.map((i) => i.querySelector('.reg-rail-lbl')?.textContent?.trim())).toEqual([
      'Tu negocio',
      'Tu cuenta',
      'Listo',
    ]);
    expect(items[0].getAttribute('aria-current')).toBe('step');
    expect(items[1].getAttribute('aria-current')).toBeNull();
  });

  it('al avanzar, el hito actual se mueve', async () => {
    const { dom, page, settle } = await setupRegistroPage();

    page.goTo(2);
    await settle();

    const items = Array.from(dom.querySelectorAll('.reg-rail-item'));
    expect(items[0].getAttribute('aria-current')).toBeNull();
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[0].classList.contains('is-done')).toBe(true);
  });

  it('conserva un único h1 enfocable por paso', async () => {
    const { dom } = await setupRegistroPage();
    const headings = dom.querySelectorAll('h1');

    expect(headings.length).toBe(1);
    expect(headings[0].getAttribute('tabindex')).toBe('-1');
  });

  it('el progressbar sigue reportando el número de paso', async () => {
    const { dom, page, settle } = await setupRegistroPage();
    const bar = () => dom.querySelector('[role="progressbar"]')!;

    expect(bar().getAttribute('aria-valuenow')).toBe('1');
    expect(bar().getAttribute('aria-valuemin')).toBe('1');
    expect(bar().getAttribute('aria-valuemax')).toBe('3');

    page.goTo(3);
    await settle();
    expect(bar().getAttribute('aria-valuenow')).toBe('3');
  });

  it('un hito ya cumplido se puede abrir desde el riel', async () => {
    const { dom, page, settle } = await setupRegistroPage();

    page.goTo(2);
    await settle();

    // El hito 1 se dibuja con un ✓: si se ve completado, tiene que abrirse.
    const done = dom.querySelectorAll('.reg-rail-item')[0].querySelector('button')!;
    expect(done).toBeTruthy();
    expect(done.getAttribute('aria-label')).toContain('Volver al paso 1');

    done.click();
    await settle();

    expect(dom.querySelector('h1')?.textContent).toContain('Cuéntanos de tu negocio');
  });

  it('un hito que aún no llega no es clickeable', async () => {
    const { dom } = await setupRegistroPage();
    const items = Array.from(dom.querySelectorAll('.reg-rail-item'));

    // En el paso 1, ni el actual ni los futuros ofrecen botón.
    expect(items[0].querySelector('button')).toBeNull();
    expect(items[1].querySelector('button')).toBeNull();
    expect(items[2].querySelector('button')).toBeNull();
  });

  it('el panel refleja lo respondido en el paso 1', async () => {
    const { dom, page, settle } = await setupRegistroPage();

    page.negocio.controls['name'].setValue('LuchoEcommerce');
    page.negocio.controls['rubro'].setValue('general');
    page.negocio.controls['hasRuc'].setValue(false);
    await settle();

    const panel = dom.querySelector('app-registro-live-panel')!;
    expect(panel.textContent).toContain('luchoecommerce.proxima.pe');
    expect(panel.textContent).toContain('General / Otros');
    expect(panel.textContent).toContain('Aún no');
  });
});
