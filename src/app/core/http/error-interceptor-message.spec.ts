/**
 * PPR-106 — el `detail` crudo del backend llegaba al toast.
 *
 * Al pulsar "Mejorar" en Hub → Plan, el comerciante recibía DOS mensajes por el
 * mismo error: uno escrito para personas bajo la lista, y en el toast el
 * `detail` interno, en inglés y con jerga:
 *
 *   "PAYMENT_PROVIDER_SYNC_REQUIRED: Plan requires Mercado Pago sync
 *    (sync_targets including payment_provider) before subscription checkout"
 *
 * El interceptor hacía `if (typeof detail === 'string') return detail`. La
 * issue avisa que el patrón se repetiría en cualquier 4xx, así que el arreglo
 * va acá y no en la pantalla del plan.
 */
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';

import { errorInterceptor } from './error.interceptor';

function toastFor(status: number, body: Record<string, unknown>): string {
  const add = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: MessageService, useValue: { add } },
    ],
  });
  const http = TestBed.inject(HttpClient);
  const ctrl = TestBed.inject(HttpTestingController);

  http.get('/x').subscribe({ error: () => undefined });
  ctrl.expectOne('/x').flush(body, { status, statusText: 'Error' });

  const call = add.mock.calls[0]?.[0] as { detail?: string } | undefined;
  TestBed.resetTestingModule();
  return call?.detail ?? '';
}

describe('errorInterceptor — qué se le muestra al comerciante (PPR-106)', () => {
  it('un código interno NO se muestra crudo', () => {
    const crudo =
      'PAYMENT_PROVIDER_SYNC_REQUIRED: Plan requires Mercado Pago sync (sync_targets including payment_provider) before subscription checkout';

    const shown = toastFor(422, { detail: crudo });

    expect(shown).not.toContain('PAYMENT_PROVIDER_SYNC_REQUIRED');
    expect(shown).not.toContain('sync_targets');
  });

  it('ese código concreto se traduce a algo accionable', () => {
    const shown = toastFor(422, { detail: 'PAYMENT_PROVIDER_SYNC_REQUIRED: whatever' });

    expect(shown).toBe(
      'Este plan todavía no se puede contratar en línea. Escríbenos y lo activamos contigo.',
    );
  });

  it('un código sin traducción cae en un mensaje genérico, no en el código', () => {
    const shown = toastFor(422, { detail: 'SOME_OTHER_INTERNAL_CODE: internal jargon here' });

    expect(shown).toBe('No se pudo completar la acción. Intenta de nuevo.');
  });

  it('un detail escrito para personas SÍ se muestra: no se pierde información útil', () => {
    const shown = toastFor(400, { detail: 'Debes verificar tu correo para realizar esta acción.' });

    expect(shown).toBe('Debes verificar tu correo para realizar esta acción.');
  });

  it('la lista de errores de validación de FastAPI nunca es texto de producto', () => {
    const shown = toastFor(422, { detail: [{ loc: ['body', 'email'], msg: 'field required' }] });

    expect(shown).toBe('No se pudo completar la acción. Intenta de nuevo.');
  });

  it('los mensajes por status siguen igual', () => {
    expect(toastFor(403, {})).toBe('No tienes permiso para realizar esta acción.');
    expect(toastFor(500, { detail: 'BOOM_INTERNAL: stack trace' })).toBe(
      'Ocurrió un error en el servidor. Intenta de nuevo más tarde.',
    );
  });
});
