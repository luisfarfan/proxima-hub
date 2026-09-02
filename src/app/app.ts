import { Component, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { filter, take } from 'rxjs';

import { GlobalHttpLoadingBarComponent } from './shared/global-http-loading-bar/global-http-loading-bar.component';
import { NavProgressBarComponent } from './shared/nav-progress-bar/nav-progress-bar.component';

/**
 * Las dos barras van acá y no dentro del shell del Hub porque las pantallas que
 * más esperan —login y elegir negocio— no tienen shell.
 *
 * Comparten el borde superior a propósito. Casi nunca coinciden: la de
 * navegación corre mientras el router resuelve la ruta, la de datos mientras
 * llegan las respuestas. Cuando se solapan se leen como una sola barra
 * continua, que es justo lo que uno quiere percibir.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, NavProgressBarComponent, GlobalHttpLoadingBarComponent],
  template: `
    <app-nav-progress-bar />
    <app-global-http-loading-bar />
    <p-toast position="top-right" />
    <router-outlet />
  `,
})
export class App {
  private readonly router = inject(Router);

  constructor() {
    // Retira el arranque de index.html cuando la primera navegación termina, no
    // cuando Angular arranca: entre esos dos momentos está el guard resolviendo
    // la sesión, y ahí quedaba un segundo hueco en blanco.
    //
    // Escucha también Cancel y Error porque una redirección del guard —a /login,
    // a /elegir-negocio— cancela la navegación original; sin eso el arranque se
    // quedaría pegado en pantalla para siempre.
    this.router.events
      .pipe(
        filter(
          (e) =>
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError,
        ),
        take(1),
      )
      .subscribe(() => {
        const boot = document.getElementById('px-boot');
        if (!boot) return;
        boot.classList.add('px-boot-out');
        setTimeout(() => boot.remove(), 260);
      });
  }
}
