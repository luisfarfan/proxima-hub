import { Component, inject } from '@angular/core';
import { GlobalHttpLoadingService } from '../../../core/http/global-http-loading.service';

@Component({
  selector: 'app-home',
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-canvas px-8">
      <div class="max-w-sm w-full text-center space-y-6">
        <div class="space-y-2">
          <h1 class="text-4xl font-medium text-[var(--px-ink)]" style="font-family: var(--font-display)">
            Próxima
          </h1>
          <p class="text-sm text-[var(--px-ink-muted)]">
            Hub — identidad, launcher y cuenta de la suite
          </p>
        </div>

        <div class="rounded-[var(--radius-card)] border border-[var(--px-hairline)] bg-[var(--px-surface-1)] p-6 text-left space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-[var(--px-ink-muted)]">
            Fase 0 · Scaffold
          </p>
          <ul class="space-y-1.5 text-sm text-[var(--px-ink)]">
            <li class="flex items-center gap-2">
              <span class="text-[var(--theme-sol)]">✓</span> Angular 21 + standalone
            </li>
            <li class="flex items-center gap-2">
              <span class="text-[var(--theme-sol)]">✓</span> PrimeNG 21 + Tailwind v4
            </li>
            <li class="flex items-center gap-2">
              <span class="text-[var(--theme-sol)]">✓</span> Design system (Fraunces + Inter + Plus Jakarta)
            </li>
            <li class="flex items-center gap-2">
              <span class="text-[var(--theme-sol)]">✓</span> RuntimeConfigService + APP_INITIALIZER
            </li>
            <li class="flex items-center gap-2">
              <span class="text-[var(--theme-sol)]">✓</span> HTTP interceptors (api-base, error, loading)
            </li>
          </ul>
        </div>

        <p class="text-xs text-[var(--px-ink-subtle)]">
          Fase 1+ — Identidad / Hub / Cuenta
        </p>
      </div>
    </div>
  `,
})
export class HomeComponent {
  protected readonly loading = inject(GlobalHttpLoadingService);
}
