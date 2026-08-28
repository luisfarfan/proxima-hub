import type { BusinessMembership, HubUser } from '@luisfarfan/auth';

/** Lo que se muestra cuando de verdad no hay de dónde sacar el nombre. */
export const FALLBACK_BUSINESS_NAME = 'Mi negocio';

/**
 * PPR-96 — el nombre del negocio se perdía en cada recarga.
 *
 * Las tres pantallas que lo muestran (shell, centro y cuenta) lo resolvían sólo
 * contra `auth.memberships()`, y esa lista únicamente se llena en el camino de
 * LOGIN (`getMemberships()`). Al restaurar sesión —recarga, pestaña nueva,
 * vuelta desde el Admin— corre `ensureUserLoaded()` → `GET /me`, que no la
 * toca: lista vacía, y el genérico "Mi negocio" en cabecera y hero.
 *
 * El dato viene en esa misma respuesta: `/me` devuelve `active_business`. Así
 * que se consulta primero la lista (que es la que sabe de cuentas
 * multi-negocio) y, si no dice nada, la sesión.
 */
export function resolveActiveBusinessName(
  memberships: readonly BusinessMembership[] | null | undefined,
  user: HubUser | null | undefined,
  businessId: string | null | undefined,
): string {
  const fromMemberships = (memberships ?? []).find((m) => m.id === businessId)?.name?.trim();
  if (fromMemberships) return fromMemberships;

  const active = user?.active_business;
  // Sin `businessId` todavía (arranque), la sesión sigue siendo la mejor pista;
  // con uno, sólo vale si es el mismo negocio.
  if (active?.name?.trim() && (!businessId || active.id === businessId)) {
    return active.name.trim();
  }

  return FALLBACK_BUSINESS_NAME;
}
