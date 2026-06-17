import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '@proxima/auth';
import { AuthGuestShellComponent } from './auth-guest-shell.component';
import { AuthInlineAlertComponent } from './auth-inline-alert.component';
import {
  AUTH_GUEST_BTN,
  AUTH_GUEST_FIELD_ERROR,
  AUTH_GUEST_INPUT,
  AUTH_GUEST_LABEL,
  AUTH_GUEST_LINK,
} from './auth-guest.styles';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    AuthGuestShellComponent,
    AuthInlineAlertComponent,
  ],
  templateUrl: './forgot-password-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly submitted = signal(false);

  readonly inputClass = AUTH_GUEST_INPUT;
  readonly labelClass = AUTH_GUEST_LABEL;
  readonly linkClass = AUTH_GUEST_LINK;
  readonly btnClass = AUTH_GUEST_BTN;
  readonly fieldErrorClass = AUTH_GUEST_FIELD_ERROR;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid || this.loading() || this.submitted()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email } = this.form.getRawValue();

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
    });
  }
}
