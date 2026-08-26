import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { AuthGuestShellComponent } from './auth-guest-shell.component';

type CompiledComponent = { ɵcmp?: { styles?: string[] } };

function compiledCss(): string {
  const styles = (AuthGuestShellComponent as unknown as CompiledComponent).ɵcmp?.styles ?? [];
  if (styles.length === 0) throw new Error('el shell de invitado no tiene estilos compilados');
  return styles.join('\n');
}

@Component({
  standalone: true,
  imports: [AuthGuestShellComponent],
  template: `
    <app-auth-guest-shell title="Entra a tu negocio" [split]="split">
      <p>contenido</p>
    </app-auth-guest-shell>
  `,
})
class HostComponent {
  split = true;
}

function render(split = true) {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.split = split;
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AuthGuestShellComponent', () => {
  it('la marca es el bloque de Próxima, no un .webp de media.proxima.pe', () => {
    const el = render();

    expect(el.innerHTML).not.toContain('media.proxima.pe');
    expect(el.querySelectorAll('img')).toHaveLength(0);
    expect(el.querySelector('.fachada proxima-logo')).not.toBeNull();
  });

  it('el año del pie sale del reloj — decía 2025 con el año ya cambiado', () => {
    const foot = render().querySelector('.guest-foot');

    expect(foot?.textContent).toContain(String(new Date().getFullYear()));
    expect(foot?.textContent).not.toContain('2025 Proxima');
  });

  it('la fachada está en el árbol siempre: en teléfono es la franja de arriba', () => {
    const fachada = render().querySelector('.fachada');

    // La versión anterior la escondía con `hidden lg:flex`, así que por debajo
    // de 1024 px no quedaba ni un rastro de marca en la pantalla de entrar.
    expect(fachada).not.toBeNull();
    expect(fachada?.className).not.toContain('hidden');
  });

  it('la pared es amarilla desde el primer píxel, sin consulta de medios', () => {
    const css = compiledCss();

    // El amarillo del sitio, y declarado antes de la primera `@media`: si sólo
    // viviera dentro de una consulta, la pared saldría en blanco en el resto.
    expect(css).toContain('oklch(0.868 0.163 89)');
    expect(css.indexOf('oklch(0.868 0.163 89)')).toBeLessThan(css.indexOf('@media'));
  });

  it('el teléfono bajo encoge la franja para que el botón de entrar quepa', () => {
    expect(compiledCss()).toContain('(max-width: 1023px) and (max-height: 720px)');
  });

  it('los objetivos táctiles llegan hasta la tableta, que también se toca', () => {
    const css = compiledCss();
    const touch = css.slice(css.lastIndexOf('@media (max-width: 1023px)'));

    expect(touch).toContain('min-height: 44px');
  });

  it('sin panel la marca acompaña la tarjeta centrada', () => {
    const el = render(false);

    expect(el.querySelector('.fachada')).toBeNull();
    expect(el.querySelector('.guest-plain-marca proxima-logo')).not.toBeNull();
  });
});
