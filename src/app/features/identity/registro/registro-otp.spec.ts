import { setupRegistroPage } from './registro-page.testing';

/**
 * El código llega por correo y se pega entero. El campo anterior se veía como
 * seis casillas pero era un solo input: pegarlo funcionaba de casualidad y
 * nada indicaba cuántos dígitos faltaban.
 */
describe('Registro — código en seis casillas', () => {
  async function atCodeStep() {
    const ctx = await setupRegistroPage();
    ctx.page.awaitingCode.set(true);
    await ctx.settle();
    return ctx;
  }

  function boxes(dom: HTMLElement) {
    return Array.from(dom.querySelectorAll<HTMLInputElement>('app-registro-code-input input'));
  }

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('renderiza seis casillas con el nombre accesible del grupo', async () => {
    const { dom } = await atCodeStep();
    const group = dom.querySelector('app-registro-code-input [role="group"]')!;

    expect(boxes(dom).length).toBe(6);
    expect(group.getAttribute('aria-label')).toContain('6 dígitos');
  });

  it('escribir un dígito mueve el foco a la casilla siguiente', async () => {
    const { dom, settle } = await atCodeStep();
    const all = boxes(dom);

    all[0].focus();
    type(all[0], '4');
    await settle();

    expect(document.activeElement).toBe(all[1]);
  });

  it('Backspace en una casilla vacía vuelve a la anterior', async () => {
    const { dom, settle } = await atCodeStep();
    const all = boxes(dom);

    all[0].focus();
    type(all[0], '4');
    await settle();

    all[1].focus();
    all[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    await settle();

    expect(document.activeElement).toBe(all[0]);
    expect(boxes(dom)[0].value).toBe('');
  });

  it('pegar el código llena las seis casillas y el control', async () => {
    const { dom, page, settle } = await atCodeStep();
    const all = boxes(dom);

    const paste = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => '419207' },
    });
    all[0].dispatchEvent(paste);
    await settle();

    expect(boxes(dom).map((b) => b.value).join('')).toBe('419207');
    expect(page.codeCtrl.value).toBe('419207');
  });

  it('la primera casilla conserva one-time-code e inputmode numérico', async () => {
    const { dom } = await atCodeStep();
    const [first] = boxes(dom);

    expect(first.getAttribute('autocomplete')).toBe('one-time-code');
    expect(first.getAttribute('inputmode')).toBe('numeric');
  });

  it('los errores del código siguen llegando por role=alert', async () => {
    const { dom, fixture, settle } = await atCodeStep();

    (fixture.componentInstance as unknown as { codeError: { set(v: string): void } }).codeError.set(
      'Código incorrecto. Revísalo e inténtalo de nuevo.',
    );
    await settle();

    const alert = dom.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Código incorrecto');
    expect(alert.id).toBe('reg-code-err');
  });

  it('un reenvío vencido explica qué pasó y ofrece la salida', async () => {
    const { dom, settle, enterCodeStep } = await setupRegistroPage({ resendCode: 'expired' });
    await enterCodeStep();

    dom.querySelectorAll<HTMLButtonElement>('.reg-textbtn')[0].click();
    await settle();

    // No es «no pudimos reenviar»: el registro venció y hay que rehacerlo.
    const alert = dom.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('El código venció');
    expect(alert.textContent).toContain('No se creó ninguna cuenta');
    expect(dom.querySelector('.reg-nav button')?.textContent).toContain('Pedir un código nuevo');
  });

  it('un reenvío vencido no pinta las casillas como código equivocado', async () => {
    const { dom, settle, enterCodeStep } = await setupRegistroPage({ resendCode: 'expired' });
    await enterCodeStep();

    dom.querySelectorAll<HTMLButtonElement>('.reg-textbtn')[0].click();
    await settle();

    // Las casillas desaparecen en vez de quedarse en rojo con el error de otro.
    expect(dom.querySelectorAll('app-registro-code-input input.is-invalid').length).toBe(0);
  });

  it('«Pedir un código nuevo» devuelve al paso de la cuenta, sin cuenta creada', async () => {
    const { dom, page, settle, enterCodeStep } = await setupRegistroPage({ resendCode: 'expired' });
    await enterCodeStep();

    dom.querySelectorAll<HTMLButtonElement>('.reg-textbtn')[0].click();
    await settle();
    dom.querySelector<HTMLButtonElement>('.reg-nav button')!.click();
    await settle();

    expect(page.registrationExpired()).toBe(false);
    expect(dom.querySelector('h1')?.textContent).toContain('Crea tu cuenta');
    expect(page.codeCtrl.value).toBe('');
  });
});
