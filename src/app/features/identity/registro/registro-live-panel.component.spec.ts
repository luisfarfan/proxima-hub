import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RegistroLivePanelComponent } from './registro-live-panel.component';

/**
 * El panel acompaña, no informa: todo lo que muestra ya está en el formulario.
 * Por eso acá se afirman dos cosas — que refleja el nombre tal como el usuario
 * lo va escribiendo, y que se mantiene fuera del árbol de accesibilidad.
 */
describe('RegistroLivePanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroLivePanelComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  async function render(name: string, rubroLabel = '', extra: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(RegistroLivePanelComponent);
    fixture.componentRef.setInput('name', name);
    fixture.componentRef.setInput('rubroLabel', rubroLabel);
    for (const [key, value] of Object.entries(extra)) {
      fixture.componentRef.setInput(key, value);
    }
    await fixture.whenStable();
    return fixture;
  }

  const summary = (dom: HTMLElement) =>
    Array.from(dom.querySelectorAll('.summary-row')).map((row) => ({
      label: row.querySelector('dt')?.textContent?.trim(),
      value: row.querySelector('dd')?.textContent?.trim(),
    }));

  it('refleja el nombre como monograma y subdominio', async () => {
    const fixture = await render('Bodega San Martín');
    const dom = fixture.nativeElement as HTMLElement;

    expect(dom.querySelector('.mono')?.textContent?.trim()).toBe('B');
    expect(dom.textContent).toContain('bodega-san-martin.proxima.pe');
    expect(dom.textContent).toContain('Bodega San Martín');
  });

  it('sin nombre muestra el subdominio de ejemplo y no falla', async () => {
    const fixture = await render('');
    const dom = fixture.nativeElement as HTMLElement;

    expect(dom.textContent).toContain('tu-negocio.proxima.pe');
    expect(dom.textContent).toContain('Tu negocio');
    expect(dom.querySelector('.mono')?.textContent?.trim()).toBe('·');
  });

  it('sin rubro todavía, anuncia lo que hará con él', async () => {
    const fixture = await render('Bodega San Martín');
    const dom = fixture.nativeElement as HTMLElement;

    expect(dom.textContent).toContain('Cargamos las categorías típicas de tu rubro');
  });

  it('el panel completo queda fuera del árbol de accesibilidad', async () => {
    const fixture = await render('Bodega San Martín');
    const dom = fixture.nativeElement as HTMLElement;

    expect(dom.querySelector('.stage')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('es presentacional: monta sin HttpClient ni AuthService en el TestBed', async () => {
    // El TestBed de este archivo no provee `provideHttpClient()` ni `AuthService`.
    // Si el componente inyectara alguno, `createComponent` lanzaría NullInjectorError.
    const fixture = await render('Bodega San Martín');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('sin respuestas todavía muestra lo que se va a preparar, no filas vacías', async () => {
    const fixture = await render('Bodega San Martín');
    const dom = fixture.nativeElement as HTMLElement;

    expect(summary(dom)).toEqual([]);
    expect(dom.querySelectorAll('.tick').length).toBe(3);
  });

  it('va sumando cada respuesta al resumen', async () => {
    const fixture = await render('Bodega San Martín', 'Bodega y minimarket', {
      hasRuc: false,
      fullName: 'Rosa Martínez',
      email: 'rosa@bodega.pe',
    });
    const dom = fixture.nativeElement as HTMLElement;

    expect(summary(dom)).toEqual([
      { label: 'Rubro', value: 'Bodega y minimarket' },
      { label: 'RUC', value: 'Aún no' },
      { label: 'Tu nombre', value: 'Rosa Martínez' },
      { label: 'Correo', value: 'rosa@bodega.pe' },
      { label: 'Plan', value: 'Gratis · S/ 0 al mes' },
    ]);
    // Con datos reales, las promesas fijas ceden el espacio.
    expect(dom.querySelectorAll('.tick').length).toBe(0);
  });

  it('con RUC declarado muestra el número cuando ya está escrito', async () => {
    const fixture = await render('Bodega San Martín', 'Bodega y minimarket', {
      hasRuc: true,
      ruc: '20512345678',
    });
    const dom = fixture.nativeElement as HTMLElement;

    expect(summary(dom)).toContainEqual({ label: 'RUC', value: '20512345678' });
  });

  it('con RUC declarado pero sin número todavía, no inventa el dato', async () => {
    const fixture = await render('Bodega San Martín', '', { hasRuc: true });
    const dom = fixture.nativeElement as HTMLElement;

    expect(summary(dom)).toContainEqual({ label: 'RUC', value: 'Sí' });
  });
});
