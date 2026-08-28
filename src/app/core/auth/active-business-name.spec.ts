/**
 * PPR-96 — tras cualquier recarga el Hub mostraba "Mi negocio".
 *
 * Las tres pantallas que muestran el nombre lo resolvían sólo contra
 * `auth.memberships()`, y esa lista se llena únicamente en el camino de LOGIN.
 * Al restaurar sesión —recarga, pestaña nueva, vuelta desde el Admin— corre
 * `ensureUserLoaded()` → `GET /me`, que no la toca: lista vacía y fallback.
 *
 * El dato viene en la misma respuesta, en `active_business`.
 */
import type { BusinessMembership, HubUser } from '@luisfarfan/auth';

import { FALLBACK_BUSINESS_NAME, resolveActiveBusinessName } from './active-business-name';

const BIZ = 'biz-1';

const membership = (over: Partial<BusinessMembership> = {}): BusinessMembership =>
  ({ id: BIZ, name: 'Megatienda Lima', ...over }) as BusinessMembership;

const user = (over: Partial<HubUser> = {}): HubUser => ({ ...over }) as HubUser;

describe('resolveActiveBusinessName (PPR-96)', () => {
  it('usa la lista de memberships cuando la hay', () => {
    expect(resolveActiveBusinessName([membership()], user(), BIZ)).toBe('Megatienda Lima');
  });

  it('sin memberships, cae en el negocio activo de la sesión — ese es el arreglo', () => {
    const sesion = user({ active_business: membership() });

    expect(resolveActiveBusinessName([], sesion, BIZ)).toBe('Megatienda Lima');
  });

  it('la lista manda: en una cuenta multi-negocio dice en cuál estás parado', () => {
    const sesion = user({ active_business: membership({ id: 'otro', name: 'Botica Vida' }) });

    expect(resolveActiveBusinessName([membership()], sesion, BIZ)).toBe('Megatienda Lima');
  });

  it('no usa el negocio de la sesión si es OTRO negocio', () => {
    // Recién cambiado de negocio: `/me` todavía trae el anterior. Mostrarlo
    // sería peor que el genérico — diría que estás donde no estás.
    const sesion = user({ active_business: membership({ id: 'otro', name: 'Botica Vida' }) });

    expect(resolveActiveBusinessName([], sesion, BIZ)).toBe(FALLBACK_BUSINESS_NAME);
  });

  it('en el arranque, sin businessId todavía, la sesión sigue siendo la mejor pista', () => {
    const sesion = user({ active_business: membership() });

    expect(resolveActiveBusinessName([], sesion, null)).toBe('Megatienda Lima');
  });

  it('sin nada, el genérico', () => {
    expect(resolveActiveBusinessName([], user(), BIZ)).toBe(FALLBACK_BUSINESS_NAME);
    expect(resolveActiveBusinessName(null, null, BIZ)).toBe(FALLBACK_BUSINESS_NAME);
  });

  it('un nombre en blanco no cuenta como nombre', () => {
    expect(resolveActiveBusinessName([membership({ name: '   ' })], user(), BIZ)).toBe(
      FALLBACK_BUSINESS_NAME,
    );
  });
});
