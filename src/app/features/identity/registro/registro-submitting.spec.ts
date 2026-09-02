import { of, throwError } from 'rxjs';

import { setupRegistroPage } from './registro-page.testing';

/**
 * Crear la cuenta toca varios sistemas (negocio, subdominio, catálogo) y tarda
 * unos segundos. Antes solo cambiaba el texto del botón: se veía igual que una
 * pantalla colgada. Ahora se dice qué está pasando — y si falla, desaparece.
 */
describe('Registro — creando la cuenta', () => {
  async function atLastStep(startRegistration?: () => ReturnType<typeof of>) {
    const ctx = await setupRegistroPage(
      startRegistration ? { startRegistration } : {},
    );
    ctx.page.goTo(3);
    await ctx.settle();
    return ctx;
  }

  it('lista los tres pasos en una región aria-live mientras envía', async () => {
    const { dom, page, settle } = await atLastStep();

    page.submitting.set(true);
    await settle();

    const live = dom.querySelector('.reg-creating')!;
    expect(live.getAttribute('aria-live')).toBe('polite');

    const steps = Array.from(live.querySelectorAll('.reg-creating-step')).map((s) =>
      s.textContent?.trim(),
    );
    expect(steps.length).toBe(3);
    expect(steps[0]).toContain('Creamos tu negocio');
    expect(steps[1]).toContain('.proxima.pe');
    expect(steps[2]).toContain('categorías de tu rubro');
  });

  it('la pantalla final conserva su mensaje', async () => {
    const { dom, page, settle } = await atLastStep();

    page.success.set(true);
    await settle();

    expect(dom.textContent).toContain('Tu cuenta está lista');
    expect(dom.querySelector('.reg-creating')).toBeNull();
  });

  it('si el envío falla, los pasos desaparecen y vuelve el error del paso 3', async () => {
    const { dom, fixture, page, settle } = await atLastStep(() =>
      throwError(() => new Error('caída')),
    );

    page.negocio.controls['name'].setValue('Bodega San Martín');
    page.negocio.controls['rubro'].setValue('minimarket');
    page.negocio.controls['hasRuc'].setValue(false);
    page.cuenta.controls['fullName'].setValue('Rosa Martínez');
    page.cuenta.controls['email'].setValue('rosa@bodega.pe');
    page.cuenta.controls['password'].setValue('bodega2026');
    (fixture.componentInstance as unknown as { form: { controls: { terms: { setValue(v: boolean): void } } } })
      .form.controls.terms.setValue(true);
    await settle();

    await (fixture.componentInstance as unknown as { submit(): Promise<void> }).submit();
    await settle();

    expect(dom.querySelector('.reg-creating')).toBeNull();
    const alert = dom.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('No pudimos enviar el código');
  });
});
