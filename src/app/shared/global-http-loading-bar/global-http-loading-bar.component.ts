import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { GlobalHttpLoadingService } from '../../core/http/global-http-loading.service';

/**
 * La barra de «algo está pidiendo datos».
 *
 * Portada de proxima-admin, donde vive dentro del header. Acá va fija arriba
 * porque el Hub tiene pantallas sin cabecera —login, elegir negocio— y son
 * justamente las que más esperan: elegir negocio pide las membresías y la ficha
 * de cada comercio antes de poder dibujar nada.
 *
 * El servicio ya venía en el repo con su interceptor contando peticiones en
 * vuelo; lo único que faltaba era alguien que lo pintara. `active()` ya trae el
 * rebote incorporado (no aparece para una petición de 80 ms, y si aparece se
 * queda un mínimo visible) así que acá no hay que temporizar nada.
 */
@Component({
  selector: 'app-global-http-loading-bar',
  standalone: true,
  template: `
    @if (loading.active()) {
      <div
        class="pointer-events-none fixed inset-x-0 top-0 z-[9998] h-[2px] overflow-hidden"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Cargando datos"
        data-testid="global-http-loading-bar"
      >
        <div class="http-bar-segment h-full w-1/3 bg-primary"></div>
      </div>
    }
  `,
  styles: [
    `
      @keyframes http-bar-slide {
        0% {
          transform: translateX(-120%);
        }
        100% {
          transform: translateX(420%);
        }
      }

      .http-bar-segment {
        animation: http-bar-slide 1.1s ease-in-out infinite;
      }

      /*
       * Sin movimiento la barra sigue diciendo «esto está trabajando»: se queda
       * quieta, entera y algo apagada. Desaparecerla dejaría a quien pidió menos
       * movimiento sin ninguna señal.
       */
      @media (prefers-reduced-motion: reduce) {
        .http-bar-segment {
          animation: none;
          width: 100%;
          opacity: 0.85;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalHttpLoadingBarComponent {
  readonly loading = inject(GlobalHttpLoadingService);
}
