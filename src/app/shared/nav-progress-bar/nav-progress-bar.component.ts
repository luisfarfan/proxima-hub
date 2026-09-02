import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { Subscription } from 'rxjs';

/**
 * La barra de «estoy cambiando de pantalla».
 *
 * Portada de proxima-admin sin cambios de comportamiento: avanza sola hasta 72%
 * mientras el router navega y salta a 100% al terminar. El progreso es inventado
 * a propósito —nadie sabe cuánto falta— pero lo que comunica es cierto: algo
 * está pasando y no se colgó.
 *
 * Funciona sin Zone.js: las señales agendan su propio render.
 */
@Component({
  selector: 'app-nav-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div
        role="progressbar"
        aria-label="Cargando página"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuenow]="progress()"
        class="fixed top-0 inset-x-0 z-[9999] h-[2px] pointer-events-none overflow-hidden"
      >
        <div
          class="nav-progress-fill h-full"
          [style.width.%]="progress()"
          [style.transition-duration]="transitionMs() + 'ms'"
        ></div>
      </div>
    }
  `,
  styles: [`
    .nav-progress-fill {
      background: var(--p-primary-500);
      transition-property: width;
      transition-timing-function: cubic-bezier(0.1, 0.4, 0.3, 1);
      box-shadow: 0 0 8px 0 color-mix(in srgb, var(--p-primary-400) 55%, transparent);
    }

    /*
     * Quien pidió menos movimiento igual necesita saber que la pantalla está
     * cambiando: la barra sigue apareciendo, deja de deslizarse.
     */
    @media (prefers-reduced-motion: reduce) {
      .nav-progress-fill {
        transition: none;
      }
    }
  `],
})
export class NavProgressBarComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  readonly visible = signal(false);
  readonly progress = signal(0);
  readonly transitionMs = signal(0);

  private sub?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.onStart();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.onComplete();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    clearTimeout(this.timer);
  }

  private onStart(): void {
    clearTimeout(this.timer);
    // Instantly show the bar at 1% (no transition), then animate slowly to 72%
    this.visible.set(true);
    this.progress.set(1);
    this.transitionMs.set(0);

    this.timer = setTimeout(() => {
      this.transitionMs.set(3000);
      this.progress.set(72);
    }, 16);
  }

  private onComplete(): void {
    clearTimeout(this.timer);
    // Snap to 100% quickly, then fade the element out
    this.transitionMs.set(200);
    this.progress.set(100);

    this.timer = setTimeout(() => {
      this.visible.set(false);
      this.progress.set(0);
      this.transitionMs.set(0);
    }, 380);
  }
}
