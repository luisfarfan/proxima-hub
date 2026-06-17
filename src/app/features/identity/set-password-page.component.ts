import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, mapAuthDetailToMessageKey, extractErrorCode } from '@proxima/auth';
import { AuthGuestShellComponent } from './auth-guest-shell.component';
import { AuthInlineAlertComponent } from './auth-inline-alert.component';
import {
  AUTH_GUEST_BTN,
  AUTH_GUEST_FIELD_ERROR,
  AUTH_GUEST_LABEL,
  AUTH_GUEST_LINK,
  AUTH_GUEST_PASSWORD_INPUT,
} from './auth-guest.styles';

function passwordsMatch(control: AbstractControl): { passwordMismatch: true } | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (!password || !confirm) return null;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-set-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    PasswordModule,
    RouterLink,
    AuthGuestShellComponent,
    AuthInlineAlertComponent,
  ],
  templateUrl: './set-password-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetPasswordPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly mode = signal<'setup' | 'reset'>('reset');
  readonly token = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showForgotCta = signal(false);

  readonly pageTitle = computed(() =>
    this.mode() === 'setup' ? 'Configura tu contraseña' : 'Restablece tu contraseña',
  );
  readonly pageSubtitle = computed(() =>
    this.mode() === 'setup'
      ? 'Crea una contraseña para activar tu cuenta'
      : 'Ingresa tu nueva contraseña para continuar',
  );

  readonly labelClass = AUTH_GUEST_LABEL;
  readonly linkClass = AUTH_GUEST_LINK;
  readonly btnClass = AUTH_GUEST_BTN;
  readonly passwordInputClass = AUTH_GUEST_PASSWORD_INPUT;
  readonly fieldErrorClass = AUTH_GUEST_FIELD_ERROR;

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] as 'setup' | 'reset' | undefined;
    this.mode.set(mode === 'setup' ? 'setup' : 'reset');

    const token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    this.token.set(token);
    if (!token) {
      this.error.set('Falta el token. Usa el enlace que recibiste por correo.');
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading() || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.showForgotCta.set(false);
    const { password } = this.form.getRawValue();

    this.auth.resetPassword(this.token(), password).subscribe({
      next: () => {
        void this.router.navigate(['/login'], { queryParams: { passwordUpdated: '1' } });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const code = extractErrorCode(err);
        const message = mapAuthDetailToMessageKey(err);
        if (message) {
          this.error.set(message);
          if (
            this.mode() === 'reset' &&
            (code === 'RESET_TOKEN_INVALID' || code === 'RESET_TOKEN_EXPIRED')
          ) {
            this.showForgotCta.set(true);
          }
        } else {
          this.error.set('Ocurrió un error inesperado. Intenta de nuevo.');
          this.showForgotCta.set(this.mode() === 'reset');
        }
      },
    });
  }
}
