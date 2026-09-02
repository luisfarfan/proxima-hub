import { Subject } from 'rxjs';

import { setupRegistroPage } from './registro-page.testing';

/**
 * La pregunta del RUC decidía dos cosas invisibles: si SUNAT completa la razón
 * social, y si el campo aparece. Ahora ambas están escritas junto a la opción.
 */
describe('Registro — la pregunta del RUC', () => {
  it('es un radiogroup con las dos opciones y su nombre accesible', async () => {
    const { dom } = await setupRegistroPage();
    const group = dom.querySelector('[role="radiogroup"]')!;
    const labelledBy = group.getAttribute('aria-labelledby')!;

    expect(dom.querySelector(`#${labelledBy}`)?.textContent?.trim()).toBe(
      '¿Tu negocio tiene RUC?',
    );
    expect(group.querySelectorAll('[role="radio"]').length).toBe(2);
  });

  it('cada opción dice qué pasa si la eliges', async () => {
    const { dom } = await setupRegistroPage();
    const [si, no] = Array.from(dom.querySelectorAll('[role="radio"]'));

    expect(si.textContent).toContain('SUNAT');
    expect(si.textContent).toContain('facturación electrónica');
    expect(no.textContent).toContain('sin rehacer nada');
  });

  it('«Sí» revela el campo RUC y su botón de verificación', async () => {
    const { dom, settle } = await setupRegistroPage();

    expect(dom.querySelector('#biz-ruc')).toBeNull();

    dom.querySelectorAll<HTMLButtonElement>('[role="radio"]')[0].click();
    await settle();

    expect(dom.querySelector('#biz-ruc')).toBeTruthy();
    expect(dom.querySelector('.btn-verify')?.textContent).toContain('Verificar');
    expect(dom.querySelectorAll('[role="radio"]')[0].getAttribute('aria-checked')).toBe('true');
  });

  it('«Aún no» oculta el campo y deja vacío el control', async () => {
    const { dom, page, settle } = await setupRegistroPage();

    dom.querySelectorAll<HTMLButtonElement>('[role="radio"]')[0].click();
    await settle();
    page.negocio.controls['ruc'].setValue('20512345678');
    await settle();

    dom.querySelectorAll<HTMLButtonElement>('[role="radio"]')[1].click();
    await settle();

    expect(dom.querySelector('#biz-ruc')).toBeNull();
    expect(page.negocio.controls['ruc'].value).toBe('');
  });

  it('un RUC encontrado sigue mostrando razón social y estado', async () => {
    const { dom, page, settle, fixture } = await setupRegistroPage();

    dom.querySelectorAll<HTMLButtonElement>('[role="radio"]')[0].click();
    await settle();
    page.negocio.controls['ruc'].setValue('20512345678');
    await settle();

    (fixture.componentInstance as unknown as { verifyRuc(): void }).verifyRuc();
    await settle();

    const ok = dom.querySelector('.ruc-ok')!;
    expect(ok.textContent).toContain('BODEGA SAN MARTIN E.I.R.L.');
    expect(ok.textContent).toContain('ACTIVO');
  });

  it('mientras SUNAT responde, «Continuar» no deja avanzar', async () => {
    const pending = new Subject<unknown>();
    const { dom, page, fixture, settle } = await setupRegistroPage({
      lookupRuc: () => pending.asObservable(),
    });

    dom.querySelectorAll<HTMLButtonElement>('[role="radio"]')[0].click();
    await settle();
    page.negocio.controls['name'].setValue('Bodega San Martín');
    page.negocio.controls['rubro'].setValue('minimarket');
    page.negocio.controls['ruc'].setValue('20512345678');
    await settle();

    const continuar = () =>
      Array.from(dom.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim() === 'Continuar',
      )!;

    expect(continuar().disabled).toBe(false);

    (fixture.componentInstance as unknown as { verifyRuc(): void }).verifyRuc();
    await settle();

    // La consulta está en vuelo: avanzar ahora dejaría pasar un RUC sin validar.
    expect(continuar().disabled).toBe(true);

    pending.next({
      ruc: '20512345678',
      razon_social: 'BODEGA SAN MARTIN E.I.R.L.',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
    });
    pending.complete();
    await settle();

    expect(continuar().disabled).toBe(false);
  });
});
