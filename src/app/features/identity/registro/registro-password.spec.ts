import { setupRegistroPage } from './registro-page.testing';

/**
 * El medidor orienta; no legisla. La única condición que impide avanzar sigue
 * siendo la del formulario (`minLength(8)`) — si el medidor empezara a exigir
 * símbolos, estaría inventando una regla que el backend no tiene.
 */
describe('Registro — fuerza de la contraseña', () => {
  async function withPassword(value: string) {
    const ctx = await setupRegistroPage();
    ctx.page.goTo(2);
    await ctx.settle();
    ctx.page.cuenta.controls['password'].setValue(value);
    await ctx.settle();
    return ctx;
  }

  const segments = (dom: HTMLElement) =>
    Array.from(dom.querySelectorAll('.pw-seg')).filter((s) => s.classList.contains('is-on')).length;

  const rules = (dom: HTMLElement) =>
    Array.from(dom.querySelectorAll('.pw-rule')).map((r) => ({
      text: r.textContent?.trim(),
      met: r.classList.contains('is-met'),
    }));

  it('con menos de 8 caracteres marca 1 de 4 y la regla de largo sin cumplir', async () => {
    const { dom } = await withPassword('abc');

    expect(segments(dom)).toBe(1);
    expect(dom.querySelectorAll('.pw-seg').length).toBe(4);
    expect(rules(dom)[0]).toEqual({ text: 'Al menos 8 caracteres', met: false });
  });

  it('con 8+ y un número marca al menos 3 de 4 y cumple ambas reglas', async () => {
    const { dom } = await withPassword('bodega2026');

    expect(segments(dom)).toBeGreaterThanOrEqual(3);
    const [largo, variedad] = rules(dom);
    expect(largo.met).toBe(true);
    expect(variedad.met).toBe(true);
  });

  it('una mayúscula vale igual que un número', async () => {
    const { dom } = await withPassword('BodegaSanMartin');
    expect(rules(dom)[1].met).toBe(true);
  });

  it('el estado se anuncia en una región aria-live', async () => {
    const { dom } = await withPassword('bodega2026');
    const live = dom.querySelector('.pw-state')!;

    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent?.trim()).toBe('Contraseña media');
  });

  it('el medidor no agrega requisitos: con 8 caracteres el control ya es válido', async () => {
    const { page } = await withPassword('bodega01');

    // Sin símbolo y sin llegar a 4 segmentos, el control igual pasa.
    expect((page.cuenta.controls['password'] as unknown as { invalid: boolean }).invalid).toBe(false);
  });
});
