import { provideZonelessChangeDetection, type Type } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '@luisfarfan/auth';

import { RegistroApiService, type RubroOption } from './registro-api.service';
import { RegistroPageComponent } from './registro-page.component';

/**
 * Andamio compartido por los specs del registro.
 *
 * La página inyecta la API del registro y `AuthService`; ninguno de los dos
 * debe salir a la red en un test. En vez de un `HttpTestingController` con
 * flush por request —que acopla cada spec al orden de las llamadas— acá se
 * reemplazan por dobles con comportamiento explícito por caso.
 */

export const RUBROS_FAKE: RubroOption[] = [
  { value: 'general', label: 'General / Otros' },
  { value: 'minimarket', label: 'Bodega y minimarket' },
  { value: 'supermarket', label: 'Supermercado' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'fast_food', label: 'Comida rápida' },
  { value: 'cafe', label: 'Café y cafetería' },
  { value: 'bakery', label: 'Panadería y pastelería' },
];

export interface RegistroApiStub {
  listRubros(): Observable<RubroOption[]>;
  checkEmail: ReturnType<typeof stubFn>;
  lookupRuc: ReturnType<typeof stubFn>;
  startRegistration: ReturnType<typeof stubFn>;
  resendCode: ReturnType<typeof stubFn>;
}

function stubFn(impl: (...args: never[]) => unknown) {
  const calls: unknown[][] = [];
  const fn = (...args: unknown[]) => {
    calls.push(args);
    return (impl as (...a: unknown[]) => unknown)(...args);
  };
  fn.calls = calls;
  return fn as ((...args: unknown[]) => never) & { calls: unknown[][] };
}

export interface SetupOptions {
  /** Respuesta de `auth/lookup-ruc`. Un `Subject` sin emitir deja la consulta en vuelo. */
  lookupRuc?: () => Observable<unknown>;
  /** Respuesta de `auth/register/resend`. `'expired'` simula el 410 del pendiente vencido. */
  resendCode?: 'expired' | (() => Observable<unknown>);
  /** Qué devuelve `acquisition/categories`. `'error'` simula la caída del catálogo. */
  rubros?: RubroOption[] | 'error';
  /** Respuesta de `auth/register/start`. Por defecto, un registro pendiente de código. */
  startRegistration?: () => Observable<unknown>;
}

export async function setupRegistroPage(options: SetupOptions = {}) {
  const rubros = options.rubros ?? RUBROS_FAKE;

  const api: RegistroApiStub = {
    listRubros: () =>
      rubros === 'error'
        ? throwError(() => new Error('categories caídas'))
        : of(rubros),
    checkEmail: stubFn(() => of({ available: true, reason: 'AVAILABLE' })),
    lookupRuc: stubFn(
      options.lookupRuc ??
        (() =>
          of({
            ruc: '20512345678',
            razon_social: 'BODEGA SAN MARTIN E.I.R.L.',
            estado: 'ACTIVO',
            condicion: 'HABIDO',
          })),
    ),
    startRegistration: stubFn(
      options.startRegistration ??
        (() => of({ registration_id: 'reg-1', email: 'rosa@bodega.pe', expires_in: 600 })),
    ),
    resendCode: stubFn(
      options.resendCode === 'expired'
        ? () =>
            throwError(
              () =>
                new HttpErrorResponse({ status: 410, error: { detail: 'REGISTRATION_EXPIRED' } }),
            )
        : options.resendCode ??
            (() => of({ registration_id: 'reg-1', email: 'rosa@bodega.pe', expires_in: 600 })),
    ),
  };

  const auth = {
    verifyRegistration: stubFn(() => of({})),
    memberships: () => [],
    businessContext: { setBusinessId: () => undefined },
  };

  await TestBed.configureTestingModule({
    imports: [RegistroPageComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: RegistroApiService, useValue: api },
      { provide: AuthService as unknown as Type<unknown>, useValue: auth },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(RegistroPageComponent);
  await fixture.whenStable();

  return {
    fixture,
    api,
    auth,
    dom: fixture.nativeElement as HTMLElement,
    /** Acceso tipado y acotado al estado interno que los specs necesitan mover. */
    page: fixture.componentInstance as unknown as {
      step: { set(value: 1 | 2 | 3): void; (): number };
      negocio: { controls: Record<string, { setValue(v: unknown): void; value: unknown }> };
      cuenta: { controls: Record<string, { setValue(v: unknown): void; value: unknown }> };
      codeCtrl: { setValue(v: string): void; value: string };
      awaitingCode: { set(v: boolean): void };
      registrationExpired: { (): boolean; set(v: boolean): void };
      resendCode(): void;
      submitting: { set(v: boolean): void };
      success: { set(v: boolean): void };
      hasRuc: { set(v: boolean | null): void };
      goTo(step: 1 | 2 | 3): void;
    },
    /**
     * Recorre el camino real hasta la pantalla del código: llena el formulario
     * y envía, para que `registrationId` quede puesto como en producción.
     * Sin él, `resendCode()` sale por el `if (!rid) return` y el test no prueba
     * nada — que es exactamente lo que pasó la primera vez.
     */
    async enterCodeStep() {
      const instance = fixture.componentInstance as unknown as {
        negocio: { controls: Record<string, { setValue(v: unknown): void }> };
        cuenta: { controls: Record<string, { setValue(v: unknown): void }> };
        form: { controls: { terms: { setValue(v: boolean): void } } };
        submit(): Promise<void>;
      };
      instance.negocio.controls['name'].setValue('Bodega San Martín');
      instance.negocio.controls['rubro'].setValue('minimarket');
      instance.negocio.controls['hasRuc'].setValue(false);
      instance.cuenta.controls['fullName'].setValue('Rosa Martínez');
      instance.cuenta.controls['email'].setValue('rosa@bodega.pe');
      instance.cuenta.controls['password'].setValue('bodega2026');
      instance.form.controls.terms.setValue(true);
      await fixture.whenStable();
      await instance.submit();
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
    },
    async settle() {
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
    },
  };
}
