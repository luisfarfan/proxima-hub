import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { AuthStore } from './store/auth.store';
import { AuthGuestShellComponent } from '../auth-guest-shell.component';
import { AuthInlineAlertComponent } from '../auth-inline-alert.component';
import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import {
  AUTH_GUEST_BTN,
  AUTH_GUEST_FIELD_ERROR,
  AUTH_GUEST_INPUT,
  AUTH_GUEST_LABEL,
  AUTH_GUEST_LINK,
  AUTH_GUEST_PASSWORD_INPUT,
} from '../auth-guest.styles';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    AuthGuestShellComponent,
    AuthInlineAlertComponent,
  ],
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  readonly authStore = inject(AuthStore);
  readonly passwordUpdatedMessage = signal<string | null>(null);
  private readonly nextUrl = signal<string | null>(null);
  readonly googleBtnRef = viewChild<ElementRef<HTMLDivElement>>('googleBtn');
  readonly googleClientId = this.runtimeConfig.googleClientId;

  readonly inputClass = AUTH_GUEST_INPUT;
  readonly passwordInputClass = AUTH_GUEST_PASSWORD_INPUT;
  readonly labelClass = AUTH_GUEST_LABEL;
  readonly linkClass = AUTH_GUEST_LINK;
  readonly btnClass = AUTH_GUEST_BTN;
  readonly fieldErrorClass = AUTH_GUEST_FIELD_ERROR;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    afterNextRender(() => {
      const clientId = this.googleClientId();
      const btnEl = this.googleBtnRef()?.nativeElement;
      if (!clientId || !btnEl || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          this.ngZone.run(() => this.authStore.loginWithGoogle(credential));
        },
      });
      window.google.accounts.id.renderButton(btnEl, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
      });
    });
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('passwordUpdated') === '1') {
      this.passwordUpdatedMessage.set('Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
    }
    this.nextUrl.set(this.route.snapshot.queryParamMap.get('next'));
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.authStore.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    await this.authStore.login(email, password, this.nextUrl());
  }
}
