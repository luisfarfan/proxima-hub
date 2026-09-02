import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { ProximaLogoComponent } from './proxima-logo.component';

@Component({
  standalone: true,
  imports: [ProximaLogoComponent],
  template: `<proxima-logo [size]="size" [tone]="tone" [wordmark]="wordmark" />`,
})
class HostComponent {
  size: 'sm' | 'md' | 'lg' = 'md';
  tone: 'ink' | 'light' = 'ink';
  wordmark = true;
}

function render(patch: Partial<HostComponent> = {}) {
  const fixture = TestBed.createComponent(HostComponent);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('proxima-logo') as HTMLElement;
}

describe('ProximaLogoComponent', () => {
  it('escribe la marca como en el sitio: PROXIMA, no «Proxima» ni «Próxima»', () => {
    const word = render().querySelector('.pxl-word');

    expect(word?.textContent?.trim()).toBe('PROXIMA');
  });

  it('dibuja la figura en CSS — nada que descargar de media.proxima.pe', () => {
    const el = render();

    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.pxl-fig')).not.toBeNull();
    expect(el.innerHTML).not.toContain('media.proxima.pe');
  });

  it('la figura es decorativa: el nombre lo lleva el texto', () => {
    const el = render();

    expect(el.querySelector('.pxl-fig')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();
  });

  it('sin palabra la figura carga el nombre, para la barra colapsada', () => {
    const el = render({ wordmark: false });

    expect(el.querySelector('.pxl-word')).toBeNull();
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Próxima');
  });

  it('expone tamaño y tono como atributos para que el CSS los enganche', () => {
    const el = render({ size: 'lg', tone: 'light' });

    expect(el.getAttribute('data-size')).toBe('lg');
    expect(el.getAttribute('data-tone')).toBe('light');
  });
});
