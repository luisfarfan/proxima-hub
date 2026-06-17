import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { AuthService, isAuthDetailCode } from '@proxima/auth';

@Component({
  selector: 'app-email-verification-banner',
  standalone: true,
  imports: [ButtonModule],
  template: `
    @if (visible()) {
      <div
        class="border-b border-hairline bg-surface-0/90 px-[length:var(--spacing-page-x)] py-2.5"
        role="status"
        data-testid="email-verification-banner"
      >
        <div class="mx-auto flex w-full max-w-[90rem] flex-wrap items-center gap-3 sm:justify-between">
          <div class="flex min-w-0 flex-1 items-start gap-2.5">
            <span
              class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-100 border border-hairline"
              aria-hidden="true"
            >
              <svg class="h-3.5 w-3.5 text-muted-color" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <div class="min-w-0 space-y-0.5">
              <p class="text-[0.8125rem] font-medium tracking-tight text-color">
                Verifica tu correo electrónico
              </p>
              <p class="text-[0.75rem] leading-relaxed text-muted-color">
                Revisa tu bandeja de entrada y haz clic en el enlace que te enviamos.
              </p>
            </div>
          </div>
          <p-button
            type="button"
            label="Reenviar correo"
            [outlined]="true"
            severity="secondary"
            size="small"
            styleClass="h-8 shrink-0 rounded-md border-hairline bg-transparent text-[0.75rem] font-medium shadow-none transition-all duration-200 hover:bg-surface-100"
            [loading]="resendLoading()"
            [disabled]="resent()"
            (onClick)="resend()"
            data-testid="email-verification-resend"
          />
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailVerificationBannerComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly resendLoading = signal(false);
  readonly resent = signal(false);

  readonly visible = computed(() => {
    if (this.auth.isSuperAdmin()) return false;
    const user = this.auth.user();
    const url = this.router.url;
    if (url.startsWith('/elegir-negocio') || url.startsWith('/login') || url.startsWith('/registro')) {
      return false;
    }
    return user != null && user.email_verified_at == null;
  });

  resend(): void {
    if (this.resendLoading()) return;
    this.resendLoading.set(true);
    this.auth.resendVerification().subscribe({
      next: () => {
        this.resendLoading.set(false);
        this.resent.set(true);
        this.messageService.add({
          severity: 'success',
          summary: 'Correo enviado',
          detail: 'Revisa tu bandeja de entrada y sigue el enlace.',
          life: 6000,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.resendLoading.set(false);
        if (isAuthDetailCode(err, 'EMAIL_ALREADY_VERIFIED')) return;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No pudimos reenviar el correo. Intenta de nuevo.',
          life: 6000,
        });
      },
    });
  }
}
