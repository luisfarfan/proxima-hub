import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ProximaLogoSize = 'sm' | 'md' | 'lg';
export type ProximaLogoTone = 'ink' | 'light';

/**
 * El bloque de marca de Próxima.
 *
 * Es el mismo lockup del sitio (`proxima-website`, `Header.astro`): la figura
 * recortada con `clip-path` más la palabra en Bricolage Grotesque con el ancho
 * apretado a 86. Todo en CSS a propósito — antes de esto la marca vivía en dos
 * `.webp` distintos servidos desde `media.proxima.pe`, así que un comercio sin
 * señal entraba a una pantalla con la marca rota. Ahora no se descarga nada.
 *
 * La misma pieza existe en `proxima-admin`; si cambia la figura, cambia en los
 * dos sitios.
 */
@Component({
  selector: 'proxima-logo',
  standalone: true,
  template: `
    <span class="pxl-fig" aria-hidden="true"></span>
    @if (wordmark()) {
      <span class="pxl-word">PROXIMA</span>
    }
  `,
  styles: `
    :host {
      --pxl-azul: oklch(0.365 0.268 265);
      --pxl-azul-claro: oklch(0.655 0.198 262);
      --pxl-tinta: oklch(0.205 0.016 74);

      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      line-height: 1;
      color: var(--pxl-tinta);
    }

    :host([data-tone='light']) {
      color: #ffffff;
    }

    .pxl-fig {
      flex-shrink: 0;
      background: var(--pxl-azul);
      clip-path: polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%);
    }

    :host([data-tone='light']) .pxl-fig {
      background: var(--pxl-azul-claro);
    }

    .pxl-word {
      font-family: 'Bricolage Grotesque', var(--font-heading), ui-sans-serif, system-ui, sans-serif;
      font-variation-settings: 'wdth' 86;
      font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1;
      white-space: nowrap;
    }

    :host([data-size='sm']) { gap: 0.4375rem; }
    :host([data-size='sm']) .pxl-fig { width: 12px; height: 19px; }
    :host([data-size='sm']) .pxl-word { font-size: 0.9375rem; }

    :host([data-size='md']) .pxl-fig { width: 14px; height: 22px; }
    :host([data-size='md']) .pxl-word { font-size: 1.15rem; }

    :host([data-size='lg']) { gap: 0.625rem; }
    :host([data-size='lg']) .pxl-fig { width: 22px; height: 34px; }
    :host([data-size='lg']) .pxl-word { font-size: 1.75rem; }
  `,
  host: {
    '[attr.data-size]': 'size()',
    '[attr.data-tone]': 'tone()',
    '[attr.role]': 'bare() ? "img" : null',
    '[attr.aria-label]': 'bare() ? "Próxima" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProximaLogoComponent {
  readonly size = input<ProximaLogoSize>('md');
  readonly tone = input<ProximaLogoTone>('ink');
  /** Sin palabra queda solo la figura — para la barra lateral colapsada. */
  readonly wordmark = input(true);

  /** Sin palabra no hay texto que leer, así que la figura carga el nombre. */
  protected readonly bare = computed(() => !this.wordmark());
}
