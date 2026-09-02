import { AuthTokenStorage } from '@luisfarfan/auth';

import { RuntimeConfigService } from '../config/runtime-config.service';

/**
 * PPR-91 — restaura la sesión desde la cookie SSO antes de que decida el guard.
 *
 * El Hub guarda la sesión en `sessionStorage`, que es POR PESTAÑA. El
 * `authGuard` de `@luisfarfan/auth` corta en seco cuando ahí no hay nada:
 *
 *     if (!tokens.hasAccessToken()) return router.parseUrl('/login');
 *
 * Nunca intenta la cookie. Pero las cookies httpOnly `access_token` /
 * `refresh_token` sí existen en `.proxima.test` (y en `.proxima.pe`), compartidas
 * por toda la suite. Resultado: un comerciante con sesión válida que abre el Hub
 * en una pestaña nueva —o al que el Admin redirige a `/plan` por un 403 de
 * plan— aterrizaba en el login. El upsell nunca se veía.
 *
 * `POST /auth/refresh` sin cuerpo entra en modo cookie: lee el `refresh_token`
 * de la cookie, rota las cookies y devuelve los tokens en el body. Con eso se
 * siembra el storage de esta pestaña y el guard encuentra lo que espera.
 *
 * Falla en silencio a propósito: sin cookie (o con una vencida) el guard hace
 * lo de siempre y manda al login. Esto añade un intento, no un requisito.
 */
export function restoreSsoSessionInitializer(
  runtime: RuntimeConfigService,
  tokens: AuthTokenStorage,
): () => Promise<void> {
  return async () => {
    // Ya hay sesión en esta pestaña (login recién hecho, o handoff ?sso=).
    if (tokens.getAccessToken()) return;

    let base: string;
    try {
      base = runtime.requireConfig().apiV1BaseUrl;
    } catch {
      // Sin config no hay a quién preguntarle; el guard decide como siempre.
      return;
    }

    try {
      const res = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        // La cookie es httpOnly: sólo viaja si se pide explícitamente.
        credentials: 'include',
      });
      if (!res.ok) return;

      const body = (await res.json()) as {
        access_token?: string;
        refresh_token?: string | null;
        token_type?: string;
        is_super_admin?: boolean;
      };
      if (!body?.access_token) return;

      tokens.saveTokens({
        access_token: body.access_token,
        refresh_token: body.refresh_token ?? null,
        token_type: body.token_type ?? 'bearer',
        is_super_admin: body.is_super_admin,
      });
    } catch {
      // Red caída, CORS, cookie vencida: no es un error de arranque.
    }
  };
}
