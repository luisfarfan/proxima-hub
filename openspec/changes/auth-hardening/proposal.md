## Why

La identidad centralizada (ver `platform-app-shell`) usa una **cookie de sesión compartida** `Domain=.proxima.pe` y un **handoff `?sso=<token>`** en la URL para mover la sesión entre apps de la suite. Una revisión de seguridad de esa superficie encontró que el **límite de confianza está roto**: la suite (confiable) y las tiendas de los comercios (contenido no confiable) comparten el dominio registrable `.proxima.pe`, y el access token viaja en la URL aun cuando la cookie ya autentica. Esto debe resolverse **antes del deploy** (storefronts aún no live, suite sin desplegar).

Lo que SÍ está bien (verificado, no se toca): el logout revoca la **sesión (sid)** y el guard la valida en cada request → `SESSION_REVOKED` propaga el logout a toda la suite.

## What Changes

- **Límite de dominio (ALTO):** la suite baja a `*.app.proxima.pe` con cookie `Domain=.app.proxima.pe`; las tiendas de comercios se quedan en `{slug}.proxima.pe`. Hoy `Domain=.proxima.pe` envía la cookie a **todo** `*.proxima.pe` — que es, completo, el namespace de tiendas (slugs libres: `pepito.proxima.pe`, etc.) — así que un storefront recibe la cookie del usuario y, same-site con la API, puede disparar requests autenticados (CSRF same-site; `SameSite=Lax` no protege entre subdominios del mismo registrable). Al bajar la suite a `*.app.proxima.pe`, la cookie ya no alcanza `{slug}.proxima.pe`. Detalle y por qué no hay opción más barata: `design.md`.
- **Slugs reservados (ALTO):** la plataforma MUST bloquear que un comercio registre slugs de infraestructura (`app`, `api`, `admin`, `pos`, `builder`, `intelligence`, `www`, …). Si un comercio tomara `app.proxima.pe`, controlaría el dominio padre de la cookie → compromiso total.
- **Allowlist de `next` (MEDIO):** `validateNextUrl` MUST restringirse a una **lista explícita de subdominios de la suite** (`app`, `admin`, `pos`, `builder`, `intelligence`), no a cualquier `*.proxima.pe`.
- **Token fuera de la URL (MEDIO):** en modo cookie (prod), el handoff entre apps NO MUST incluir `?sso=<access>`/`?sso_refresh=` en la URL — la cookie compartida basta. El `?sso=` queda solo para dev/token-mode.
- **CSRF en el API (defensa en profundidad):** para requests que mutan estado autenticados por **cookie**, el API MUST validar `Origin`/`Referer` contra la allowlist de la suite (o exigir un header/CSRF token), de modo que un origen `*.proxima.pe` no-suite no pueda actuar como el usuario.

## Non-goals
- Reescribir el modelo de sesión/JWT (el logout/revocación ya es correcto).
- Cambiar el flujo de login del Hub.

## Capabilities

### New Capabilities
- `auth-security-boundaries`: el límite de confianza de la identidad centralizada — separación de dominio suite/merchant, allowlist estricta de redirect, no-token-en-URL, y CSRF para cookie-auth.

## Impact
- **Infra (`proxima-infra` / DNS):** suite a `*.app.proxima.pe` (DNS, cert `*.app.proxima.pe`, CloudFront/S3 stacks, CORS). Tiendas siguen en `{slug}.proxima.pe`.
- **`proxima-api`:** `COOKIE_DOMAIN=.app.proxima.pe`; CSRF Origin-check para cookie-auth; **blocklist de slugs reservados** en el alta/cambio de subdominio de tienda (+ en el auto-sugeridor).
- **`@proxima/auth` (`validateNextUrl`):** allowlist explícita de hosts de suite (`*.app.proxima.pe`).
- **`proxima-hub` (`auth.store`/`select-business`) + apps:** `config.json` (apiBaseUrl → `api.app.proxima.pe`, URLs del app-switcher → `*.app.proxima.pe`); gatear `?sso=` a dev/token-mode.
