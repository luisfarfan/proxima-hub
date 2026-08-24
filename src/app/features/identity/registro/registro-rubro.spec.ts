import { RUBROS_FAKE, setupRegistroPage } from './registro-page.testing';

/**
 * Los chips son un atajo sobre el mismo catálogo, no una lista paralela: si
 * alguien los escribiera a mano, el día que la API agregue o renombre un rubro
 * el atajo mentiría. Por eso el test compara contra lo que devuelve la API.
 */
describe('Registro — rubro con chips', () => {
  it('muestra como máximo 6 chips, con las etiquetas y el orden de la API', async () => {
    const { dom } = await setupRegistroPage();
    const chips = Array.from(dom.querySelectorAll('.rubro-chip'));

    expect(chips.length).toBe(6);
    expect(chips.map((c) => c.textContent?.trim())).toEqual(
      RUBROS_FAKE.slice(0, 6).map((r) => r.label),
    );
  });

  it('elegir un chip deja el rubro en el formulario', async () => {
    const { dom, page, settle } = await setupRegistroPage();
    const chips = Array.from(dom.querySelectorAll<HTMLButtonElement>('.rubro-chip'));

    chips[1].click();
    await settle();

    expect(page.negocio.controls['rubro'].value).toBe(RUBROS_FAKE[1].value);
    expect(
      Array.from(dom.querySelectorAll('.rubro-chip'))[1].getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('elegir en el buscador completo marca el chip correspondiente', async () => {
    const { dom, page, settle } = await setupRegistroPage();

    // Lo que hace el `p-select`: escribir en el mismo control.
    page.negocio.controls['rubro'].setValue(RUBROS_FAKE[3].value);
    await settle();

    const chips = Array.from(dom.querySelectorAll('.rubro-chip'));
    expect(chips[3].getAttribute('aria-pressed')).toBe('true');
    expect(chips[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('el buscador con el catálogo completo sigue presente', async () => {
    const { dom } = await setupRegistroPage();
    expect(dom.querySelector('p-select')).toBeTruthy();
  });

  it('si el catálogo no carga, no hay chips y la página igual monta', async () => {
    const { dom, fixture } = await setupRegistroPage({ rubros: 'error' });

    expect(dom.querySelectorAll('.rubro-chip').length).toBe(0);
    expect(fixture.componentInstance).toBeTruthy();
    expect(dom.querySelector('h1')?.textContent).toContain('Cuéntanos de tu negocio');
  });
});
