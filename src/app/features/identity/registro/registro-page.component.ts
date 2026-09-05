import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';

import { AuthService, type RegisterPayload } from '@luisfarfan/auth';
import { RuntimeConfigService } from '../../../core/config/runtime-config.service';
import { RegistroApiService, RubroOption, type RucLookupResponse } from './registro-api.service';
import { RegistroLivePanelComponent } from './registro-live-panel.component';
import { RegistroCodeInputComponent } from './registro-code-input.component';
import { businessSlug } from './registro-identity.util';
import { ProximaLogoComponent } from '../../../shared/ui/proxima-logo.component';
import { ProximaPasswordInputComponent } from '../../../shared/ui/proxima-password-input.component';

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id?: string): void;
}

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-registro-page',
  standalone: true,
  imports: [
    ProximaLogoComponent,
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    SelectModule,
    ProximaPasswordInputComponent,
    CheckboxModule,
    ButtonModule,
    RegistroLivePanelComponent,
    RegistroCodeInputComponent,
  ],
  templateUrl: './registro-page.component.html',
  styleUrl: './registro-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(RegistroApiService);
  private readonly auth = inject(AuthService);
  private readonly runtimeConfig = inject(RuntimeConfigService);

  private readonly stepHeading = viewChild<ElementRef<HTMLHeadingElement>>('stepHeading');
  private readonly turnstileEl = viewChild<ElementRef<HTMLDivElement>>('turnstileEl');

  readonly turnstileSiteKey = this.runtimeConfig.turnstileSiteKey;
  readonly captchaToken = signal<string | null>(null);
  readonly captchaSatisfied = computed(() => !this.turnstileSiteKey() || !!this.captchaToken());
  private turnstileWidgetId: string | null = null;

  readonly step = signal<Step>(1);
  readonly isBack = signal(false);
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly emailTaken = signal(false);

  readonly awaitingCode = signal(false);
  readonly verifying = signal(false);
  readonly codeError = signal<string | null>(null);
  readonly resentNote = signal(false);
  /** El pendiente en Redis venció (410 REGISTRATION_EXPIRED): hay que rehacerlo. */
  readonly registrationExpired = signal(false);
  /** Falla del reenvío que NO es culpa del código tecleado. */
  readonly resendError = signal<string | null>(null);
  private readonly registrationId = signal<string | null>(null);
  readonly verifyEmailAddr = signal<string>('');
  readonly codeCtrl = this.fb.nonNullable.control('', {
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });

  readonly rubros = signal<RubroOption[]>([]);

  /**
   * Los chips son un atajo, no un catálogo: los primeros seis que devuelve
   * `acquisition/categories`, en su orden. El `p-select` de al lado sigue
   * teniendo los 70 — si el catálogo no carga, no hay chips y no pasa nada.
   */
  readonly quickRubros = computed(() => this.rubros().slice(0, 6));

  readonly selectedRubro = computed(() => {
    this.formTick();
    return this.negocio.controls.rubro.value;
  });

  pickRubro(value: string): void {
    this.negocio.controls.rubro.setValue(value);
    this.negocio.controls.rubro.markAsTouched();
  }

  /** Familia de icono por rubro. Lo que no cae en una familia usa la tienda. */
  rubroIcon(value: string): string {
    if (/food|restaurant|cafe|bakery|bar_|catering|fast/.test(value)) return 'comida';
    if (/fashion|footwear|jewelry|textiles/.test(value)) return 'moda';
    if (/pharmacy|health|beauty|parapharmacy|optical|veterinary/.test(value)) return 'salud';
    if (/hardware|construction|auto_repair|industrial|printing/.test(value)) return 'taller';
    if (/wholesale|motorcycle|bicycle|auto/.test(value)) return 'transporte';
    return 'tienda';
  }

  // ── Email availability ───────────────────────────────────────────────────
  readonly emailStatus = signal<'idle' | 'checking' | 'ok' | 'taken' | 'disposable'>('idle');

  // ── RUC lookup ───────────────────────────────────────────────────────────
  readonly rucLookup = signal<{ status: 'idle' | 'loading' | 'ok' | 'not_found' | 'error'; data?: Pick<RucLookupResponse, 'razon_social' | 'estado' | 'condicion'> }>({ status: 'idle' });
  readonly canVerifyRuc = computed(() => {
    this.formTick();
    return /^\d{11}$/.test(this.negocio.controls.ruc.value ?? '');
  });

  /**
   * Cada opción declara su consecuencia. La pregunta seca («¿tienes RUC?») no
   * le decía al usuario que responder que sí es lo que le ahorra escribir la
   * razón social, ni que responder que no no le cierra ninguna puerta.
   */
  readonly rucOptions = [
    {
      label: 'Sí, tengo RUC',
      value: true,
      consequence: 'Traemos tu razón social desde SUNAT y dejamos lista la facturación electrónica.',
    },
    {
      label: 'Aún no',
      value: false,
      consequence: 'Vendes igual desde hoy. Lo agregas cuando lo tramites, sin rehacer nada.',
    },
  ];

  setHasRuc(value: boolean): void {
    this.negocio.controls.hasRuc.setValue(value);
    this.negocio.controls.hasRuc.markAsTouched();
    if (!value) {
      // Sin RUC no queda un número a medio escribir esperando en el payload.
      this.negocio.controls.ruc.setValue('');
      this.rucLookup.set({ status: 'idle' });
    }
  }

  readonly form = this.fb.nonNullable.group({
    negocio: this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      rubro: ['', [Validators.required]],
      hasRuc: this.fb.control<boolean | null>(null, { validators: [Validators.required] }),
      ruc: ['', [Validators.pattern(/^\d{11}$/)]],
    }),
    cuenta: this.fb.nonNullable.group({
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    }),
    terms: this.fb.nonNullable.control(false, { validators: [Validators.requiredTrue] }),
  });

  get negocio() {
    return this.form.controls.negocio;
  }
  get cuenta() {
    return this.form.controls.cuenta;
  }

  readonly hasRuc = signal<boolean | null>(null);

  private readonly formTick = toSignal(this.form.valueChanges, { initialValue: null });

  readonly canContinue = computed<boolean>(() => {
    this.formTick();
    switch (this.step()) {
      case 1:
        // Con la consulta a SUNAT en vuelo, «Continuar» esperaría: si el RUC
        // resulta no existir, el usuario ya estaría en el paso 2 con un dato
        // que nadie validó. La API tarda unos segundos; el botón los aguanta.
        return this.negocio.valid && this.rucLookup().status !== 'loading';
      case 2:
        return this.cuenta.valid
          && this.emailStatus() !== 'taken'
          && this.emailStatus() !== 'disposable';
      case 3:
        return this.form.controls.terms.valid;
    }
  });

  /**
   * Fuerza de la contraseña. Es orientación, no una regla nueva: lo único que
   * bloquea el paso sigue siendo `minLength(8)` del formulario. Los segmentos
   * suben así: algo escrito (1), 8+ caracteres (2), con número o mayúscula (3),
   * con símbolo (4).
   */
  readonly passwordScore = computed(() => {
    this.formTick();
    const value = this.cuenta.controls.password.value ?? '';
    if (!value) return 0;
    if (value.length < 8) return 1;
    let score = 2;
    if (/[0-9]/.test(value) || /[A-ZÁÉÍÓÚÑ]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  });

  readonly passwordRules = computed(() => {
    this.formTick();
    const value = this.cuenta.controls.password.value ?? '';
    return [
      { label: 'Al menos 8 caracteres', met: value.length >= 8, required: true },
      {
        label: 'Una mayúscula o un número',
        met: /[0-9]/.test(value) || /[A-ZÁÉÍÓÚÑ]/.test(value),
        required: true,
      },
      { label: 'Un símbolo la haría muy fuerte', met: /[^A-Za-z0-9]/.test(value), required: false },
    ];
  });

  readonly passwordLabel = computed(() => {
    const score = this.passwordScore();
    if (score === 0) return '';
    return ['', 'Contraseña muy corta', 'Contraseña débil', 'Contraseña media', 'Contraseña fuerte'][score];
  });

  readonly passwordSegments = [1, 2, 3, 4];

  readonly stepLabel = computed(() => ['Tu negocio', 'Tu cuenta', 'Confirmar'][this.step() - 1]);

  /** Hitos del riel de progreso. `Listo` es el paso 3: revisar y crear. */
  readonly milestones = [
    { step: 1 as Step, label: 'Tu negocio' },
    { step: 2 as Step, label: 'Tu cuenta' },
    { step: 3 as Step, label: 'Listo' },
  ];

  readonly storeName = computed(() => {
    this.formTick();
    return (this.negocio.controls.name.value || '').trim();
  });
  readonly monogram = computed(() => {
    const n = this.storeName();
    return n ? n[0].toUpperCase() : '';
  });
  readonly rubroLabel = computed(() => {
    this.formTick();
    const v = this.negocio.controls.rubro.value;
    return this.rubros().find((r) => r.value === v)?.label || '';
  });
  readonly slugPreview = computed(() => businessSlug(this.storeName()));

  constructor() {
    this.api.listRubros().subscribe({
      next: (r) => this.rubros.set(r),
      error: () => this.rubros.set([]),
    });
    this.negocio.controls.hasRuc.valueChanges.subscribe((v) => this.hasRuc.set(v));

    // Reset RUC lookup result whenever the RUC field changes
    this.negocio.controls.ruc.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.rucLookup.set({ status: 'idle' }));

    // Email uniqueness check with debounce
    this.cuenta.controls.email.valueChanges
      .pipe(
        debounceTime(700),
        distinctUntilChanged(),
        filter(() => this.cuenta.controls.email.valid),
        switchMap((v) => {
          this.emailStatus.set('checking');
          return this.api.checkEmail((v ?? '').trim().toLowerCase()).pipe(
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        if (!res) { this.emailStatus.set('idle'); return; }
        this.emailStatus.set(
          res.reason === 'EMAIL_TAKEN' ? 'taken'
          : res.reason === 'DISPOSABLE_EMAIL' ? 'disposable'
          : 'ok',
        );
      });

    // Reset email status when field becomes invalid
    this.cuenta.controls.email.valueChanges
      .pipe(
        filter(() => !this.cuenta.controls.email.valid),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.emailStatus.set('idle'));

    effect(() => {
      const el = this.turnstileEl()?.nativeElement;
      const key = this.turnstileSiteKey();
      if (el && key && this.turnstileWidgetId === null) {
        this.renderTurnstile(el, key);
      }
    });
  }

  private renderTurnstile(el: HTMLElement, siteKey: string): void {
    const mount = () => {
      const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (!ts) {
        setTimeout(mount, 200);
        return;
      }
      this.turnstileWidgetId = ts.render(el, {
        sitekey: siteKey,
        callback: (token: string) => this.captchaToken.set(token),
        'expired-callback': () => this.captchaToken.set(null),
        'error-callback': () => this.captchaToken.set(null),
      });
    };
    if (!document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script');
      s.id = 'cf-turnstile-script';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
    mount();
  }

  private resetTurnstile(): void {
    const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    if (ts && this.turnstileWidgetId !== null) {
      ts.reset(this.turnstileWidgetId);
      this.captchaToken.set(null);
    }
  }

  verifyRuc(): void {
    if (!this.canVerifyRuc() || this.rucLookup().status === 'loading') return;
    this.rucLookup.set({ status: 'loading' });
    this.api.lookupRuc(this.negocio.controls.ruc.value!).subscribe({
      next: (res) => this.rucLookup.set({
        status: 'ok',
        data: { razon_social: res.razon_social, estado: res.estado, condicion: res.condicion },
      }),
      error: (err: HttpErrorResponse) => {
        const detail = (err.error as { detail?: string } | null)?.detail;
        this.rucLookup.set({ status: detail === 'RUC_NOT_FOUND' ? 'not_found' : 'error' });
      },
    });
  }

  next(): void {
    const group = this.step() === 1 ? this.negocio : this.cuenta;
    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }
    this.errorKey.set(null);
    this.isBack.set(false);
    this.step.update((s) => (s < 3 ? ((s + 1) as Step) : s));
    this.focusHeading();
  }

  back(): void {
    this.errorKey.set(null);
    this.isBack.set(true);
    this.step.update((s) => (s > 1 ? ((s - 1) as Step) : s));
    this.focusHeading();
  }

  goTo(target: Step): void {
    this.isBack.set(target < this.step());
    this.step.set(target);
    this.focusHeading();
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorKey.set(null);
    this.emailTaken.set(false);

    const v = this.form.getRawValue();
    const email = v.cuenta.email.trim().toLowerCase();
    const payload: RegisterPayload = {
      name: v.negocio.name.trim(),
      email,
      category: v.negocio.rubro || null,
      country: 'PE',
      settings: {
        has_ruc: v.negocio.hasRuc === true,
        ruc: v.negocio.hasRuc === true ? v.negocio.ruc?.trim() || null : null,
      },
      admin: {
        email,
        password: v.cuenta.password,
        full_name: v.cuenta.fullName.trim(),
      },
      captcha_token: this.captchaToken(),
    };

    this.api.startRegistration(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.registrationId.set(res.registration_id);
        this.verifyEmailAddr.set(res.email);
        this.codeError.set(null);
        this.codeCtrl.reset('');
        if (res.dev_code) {
          this.codeCtrl.setValue(res.dev_code);
        }
        this.awaitingCode.set(true);
        setTimeout(() => document.querySelector<HTMLInputElement>('app-registro-code-input input')?.focus(), 80);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        const detail =
          err instanceof HttpErrorResponse ? (err.error?.detail ?? null) : null;
        if (err instanceof HttpErrorResponse && err.status === 409) {
          this.emailTaken.set(true);
          this.cuenta.controls.email.setErrors({ taken: true });
          this.goTo(2);
        } else if (detail === 'DISPOSABLE_EMAIL') {
          this.errorKey.set('Usa un correo real; los correos temporales no están permitidos.');
          this.goTo(2);
        } else if (detail === 'CAPTCHA_REQUIRED' || detail === 'CAPTCHA_INVALID') {
          this.resetTurnstile();
          this.errorKey.set('Completa la verificación de seguridad e inténtalo de nuevo.');
        } else {
          this.errorKey.set('No pudimos enviar el código. Inténtalo de nuevo.');
        }
      },
    });
  }

  verifyCode(): void {
    const rid = this.registrationId();
    if (!rid || this.codeCtrl.invalid || this.verifying()) {
      this.codeCtrl.markAsTouched();
      return;
    }
    this.verifying.set(true);
    this.codeError.set(null);
    this.auth.verifyRegistration(rid, this.codeCtrl.value.trim()).subscribe({
      next: () => {
        const biz = this.auth.memberships()[0];
        if (biz) {
          this.auth.businessContext.setBusinessId(biz.id);
        }
        this.awaitingCode.set(false);
        this.success.set(true);
        setTimeout(() => (window.location.href = '/'), 1100);
      },
      error: (err: unknown) => {
        this.verifying.set(false);
        const detail =
          err instanceof HttpErrorResponse ? (err.error?.detail ?? null) : null;
        if (detail === 'CODE_INVALID') {
          this.codeError.set('Código incorrecto. Revísalo e inténtalo de nuevo.');
        } else if (detail === 'REGISTRATION_EXPIRED') {
          this.registrationExpired.set(true);
        } else if (detail === 'TOO_MANY_ATTEMPTS') {
          this.codeError.set('Demasiados intentos. Pide un código nuevo.');
        } else {
          this.codeError.set('No pudimos verificar el código. Inténtalo de nuevo.');
        }
      },
    });
  }

  resendCode(): void {
    const rid = this.registrationId();
    if (!rid) return;
    this.codeError.set(null);
    this.resendError.set(null);
    this.api.resendCode(rid).subscribe({
      next: (res) => {
        this.resentNote.set(true);
        if (res.dev_code) {
          this.codeCtrl.setValue(res.dev_code);
        }
        setTimeout(() => this.resentNote.set(false), 3000);
      },
      error: (err: unknown) => {
        // 410 = el registro pendiente venció. Decirle «no pudimos reenviar» lo
        // deja mirando seis casillas que ya no sirven: no hay código que pedir.
        if (err instanceof HttpErrorResponse && err.status === 410) {
          this.registrationExpired.set(true);
          return;
        }
        this.resendError.set('No pudimos reenviar el código. Inténtalo de nuevo.');
      },
    });
  }

  /** Vuelve al paso 2 con los datos puestos: el correo es lo único a reconfirmar. */
  restartRegistration(): void {
    this.registrationExpired.set(false);
    this.resendError.set(null);
    this.codeError.set(null);
    this.codeCtrl.reset('');
    this.registrationId.set(null);
    this.awaitingCode.set(false);
    this.goTo(2);
  }

  backToAccount(): void {
    this.awaitingCode.set(false);
    this.codeError.set(null);
    this.goTo(2);
  }

  private focusHeading(): void {
    setTimeout(() => this.stepHeading()?.nativeElement?.focus(), 60);
  }
}
