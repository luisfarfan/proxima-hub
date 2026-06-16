import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Message } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../core/auth/auth.service';
import { BusinessContextService } from '../../../core/auth/business-context.service';
import { BusinessMembership } from '../../../core/models/user.model';

@Component({
  selector: 'app-select-business-page',
  standalone: true,
  imports: [Message, ButtonModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 sm:px-6">
      <div class="w-full max-w-[27.5rem] rounded-xl bg-surface-0 p-6 border border-hairline sm:p-8">
        <main id="select-business-main" tabindex="-1" aria-labelledby="select-business-title">
          <header class="mb-7 text-center">
            <div
              class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-[0.9375rem] font-semibold tracking-tight text-primary-contrast"
              aria-hidden="true"
            >
              P
            </div>
            <h1
              id="select-business-title"
              class="text-[1.125rem] font-semibold tracking-tight text-color sm:text-[1.25rem]"
              style="font-family: var(--font-heading)"
            >
              Elige tu negocio
            </h1>
            <p class="mt-1.5 text-[0.8125rem] text-muted-color">
              Selecciona el negocio al que quieres acceder
            </p>
          </header>

          @if (loading()) {
            <div role="status" aria-live="polite" class="flex flex-col items-center justify-center gap-3 py-10">
              <div
                class="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-primary"
                aria-hidden="true"
              ></div>
              <span class="text-[0.8125rem] text-muted-color">Cargando negocios…</span>
            </div>
          } @else {
            @if (loadError()) {
              <p-message severity="error" [text]="loadError()!" styleClass="mb-5 w-full" />
              <p-button
                type="button"
                label="Reintentar"
                styleClass="w-full h-9 rounded-md text-[0.8125rem] font-semibold"
                (onClick)="loadBusinesses()"
              />
            } @else {
              <ul class="m-0 flex list-none flex-col gap-2 p-0" role="list" aria-label="Negocios">
                @for (biz of businesses(); track biz.id) {
                  <li class="m-0 list-none p-0">
                    <button
                      type="button"
                      [attr.data-testid]="'select-business-' + biz.slug"
                      [attr.aria-label]="'Entrar a ' + biz.name"
                      (click)="select(biz)"
                      class="group flex w-full items-center gap-3.5 rounded-lg bg-surface-100 p-3.5 text-left border border-hairline transition-all duration-200 hover:bg-surface-100"
                    >
                      <div
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[0.8125rem] font-semibold text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-contrast"
                        aria-hidden="true"
                      >
                        {{ biz.name.charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
                        <span
                          class="truncate text-[0.8125rem] font-medium tracking-tight text-color transition-colors duration-200 group-hover:text-primary"
                        >{{ biz.name }}</span>
                        <span class="truncate text-[0.75rem] text-muted-color">&#64;{{ biz.slug }}</span>
                      </div>
                      <svg
                        class="ml-auto h-3.5 w-3.5 shrink-0 text-muted-color opacity-0 transition-all duration-200 group-hover:opacity-100"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </li>
                }
              </ul>

              @if (businesses().length === 0) {
                <div class="flex flex-col items-center py-6 text-center">
                  <svg
                    class="mb-3 h-8 w-8 text-orange-500/80"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p class="text-[0.8125rem] text-muted-color">No tienes negocios asociados.</p>
                  <button
                    type="button"
                    class="mt-3 text-[0.75rem] font-medium text-primary transition-colors duration-200 hover:underline"
                    (click)="auth.logout()"
                  >
                    Cerrar sesión
                  </button>
                </div>
              }
            }
          }

          <footer class="mt-7 border-t border-hairline pt-5 text-center">
            <button
              type="button"
              data-testid="select-business-logout"
              (click)="auth.logout()"
              class="text-[0.75rem] font-medium text-muted-color transition-colors duration-200 hover:text-color"
            >
              Cerrar sesión
              <span class="text-primary hover:underline"> →</span>
            </button>
          </footer>
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectBusinessPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly businessContext = inject(BusinessContextService);

  readonly businesses = signal<BusinessMembership[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBusinesses();
  }

  loadBusinesses(): void {
    const cached = this.auth.memberships();
    if (cached.length > 0) {
      this.businesses.set(cached);
      this.loading.set(false);
      if (cached.length === 1 && !this.auth.isSuperAdmin()) {
        this.select(cached[0]);
      }
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);

    this.auth.getMemberships().subscribe({
      next: (data) => {
        this.businesses.set(data);
        this.loading.set(false);
        if (data.length === 1 && !this.auth.isSuperAdmin()) {
          this.select(data[0]);
        }
      },
      error: () => {
        this.loadError.set('No pudimos cargar tus negocios. Intenta de nuevo.');
        this.loading.set(false);
      },
    });
  }

  select(biz: BusinessMembership): void {
    this.businessContext.applyMembership(biz);
    window.location.href = '/';
  }
}
