# Design — platform-app-shell

## Contexto y restricciones
- Reutilizar el backend existente (`/auth/*`, `/me`, `/billing`, `/admin/business/status`). **Cero reescritura de backend.**
- La cookie de sesión ya es HttpOnly en `.proxima.pe` (ADR-013) → el SSO es mayormente cableado, no infra nueva.
- Diseño: claro/plano/editorial/premium, idéntico lenguaje a `/registro` (validado). Nada de gradientes/glow/glass.

## Flujo SSO (decisión clave)

**Modelo: identidad centralizada con cookie compartida + redirect `?next=`.**

```
Usuario → admin.proxima.pe (sin cookie)
   admin guard: no hay sesión → window.location = app.proxima.pe/login?next=<url-actual>
Usuario → app.proxima.pe/login
   autentica → backend Set-Cookie en .proxima.pe (HttpOnly, Secure, SameSite=Lax)
   hub valida `next` contra allowlist (*.proxima.pe) → redirige a `next`
admin.proxima.pe (ahora con cookie) → entra, bootstrap de sesión, sin re-login
```

- **Allowlist de `next`** (anti open-redirect): solo hosts `*.proxima.pe` (+ `localhost`/`*.localhost` en dev). Rechazar cualquier otro → fallback al Hub.
- **Dev local:** la cookie no cruza bien entre `*.localhost` → se usa el handoff `?sso=<jwt>&sso_refresh=<jwt>` que ya implementa `auth.store` (se conserva).
- **POS desktop (Tauri):** abre el Hub en webview/sistema, callback con token (deep-link `proxima-pos://auth?token=`).
- **Logout:** se hace en el Hub (`POST /auth/logout` invalida sesión + limpia cookie `.proxima.pe`) → afecta a todos los apps.

### Alternativas descartadas
- **Login por app** (cada producto su login): es el anti-patrón actual; multiplica superficie/bugs. ✗
- **OAuth/OIDC propio completo** (authorization-code, PKCE, IdP separado tipo `id.proxima.pe`): correcto a gran escala (Google/Atlassian), pero **over-engineering** ahora. La cookie compartida cubre el 95% con mucho menos. Se puede evolucionar a OIDC después sin romper. ✗ (por ahora)

## La librería `@proxima/auth`

- **Formato:** Angular library (ng-packagr). Contiene **solo lógica** (servicios, guards, interceptors, token-storage, business-context, runtime-config, tipos) — **no UI**. El UI de login vive en cada app (el Hub tiene el canónico).
- **Distribución:** **GitHub Packages** (`npm.pkg.github.com`), privado y gratis. `.npmrc` por app:
  ```
  @proxima:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
  ```
  Versionado semver; publicar con `npm publish` en CI del repo `proxima-auth`.
- **Secuencia pragmática:** Fase 2-4 el Hub usa la auth **interna** (copiada de admin). Fase 5 se **extrae** a `proxima-auth` + GitHub Packages y se consume desde hub. Fase 6-7 admin/pos la adoptan. Así no bloqueamos el Hub esperando la lib.
- **Alternativa simple:** git-dependency (`github:user/proxima-auth#tag`) si GitHub Packages da fricción; contra: versionado por tag + commitear `dist`.

## Estructura del repo `proxima-hub`

```
src/app/
  core/
    auth/            ← (luego @proxima/auth) service, token storage, refresh, business-context
    config/          ← runtime-config (apiBaseUrl, turnstileSiteKey, app URLs del switcher)
    guards/          ← auth, guest, token, business
    http/            ← interceptors (api-base, bearer, refresh, business-header, error)
  features/
    identity/        ← login, registro, recuperar, restablecer, verificar, activar, elegir-negocio
    hub/             ← home (launcher + checklist + plan card)
    account/         ← cuenta, plan, seguridad, equipo
  styles/            ← tokens + Fraunces + design system (portado de admin/registro)
public/config.json   ← runtime config (apiBaseUrl, turnstileSiteKey, adminUrl, builderUrl, posUrl, intelligenceUrl)
```

## Runtime config (app URLs para el switcher)
`config.json` gana las URLs de destino: `adminUrl`, `builderUrl`, `posUrl`, `intelligenceUrl`, `mobileUrl` (store link). El app-switcher las usa; si una falta, esa tarjeta se oculta o se marca "próximamente".

## Decisiones de UX/naming
- Rutas en **español** en el Hub (`/registro`, `/recuperar`, `/verificar`, `/elegir-negocio`) — más cercano al pyme peruano; el admin migra sus enlaces.
- El registro que ya existe en `proxima-admin/features/registro` **se mueve** tal cual (es portable: usa solo `/auth/register/*` + runtime config + el design system).

## Riesgos
- **Loops de redirect** si el guard del producto y el del Hub no acuerdan estado → tests E2E de "sin sesión → login → vuelta".
- **Cookie en prod:** `Domain=.proxima.pe` + `Secure` + `SameSite=Lax` + HTTPS en todos los subdominios. Verificar antes de cortar el login de admin.
- **Big-bang vs incremental:** NO cortar el login de admin hasta que el Hub esté en prod y validado. El admin puede tener ambos (login propio + redirect al Hub) durante la transición, y se elimina al final.
