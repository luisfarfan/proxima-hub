# Design — auth-hardening

## El problema central: límite de confianza colapsado

La identidad centralizada confía en dos mecanismos que cruzan el dominio registrable `proxima.pe`:

1. **Cookie de sesión** `Domain=.proxima.pe; HttpOnly; Secure; SameSite=Lax` → el navegador la adjunta a **toda** petición a cualquier `*.proxima.pe`.
2. **Handoff `?sso=<access_token>`** en la URL al saltar entre apps.

Y `*.proxima.pe` es, **en su totalidad, el namespace de las tiendas de comercios**: cada comercio registra un slug libre (`pepito.proxima.pe`, `mitienda.proxima.pe`, … cientos/miles). Esas tiendas sirven **contenido potencialmente controlado por el comercio** (no confiable). Resultado:

- una tienda en `{slug}.proxima.pe` **recibe la cookie de sesión** del visitante (su servidor la lee aunque sea HttpOnly), y
- siendo **same-site** con la API, una página de tienda puede hacer `fetch(api, {credentials:'include'})` que sale **autenticado como el usuario** (CSRF same-site — `SameSite=Lax` solo bloquea cross-site, no entre subdominios del mismo registrable).

> Custom domains (`tienda.com` → CNAME) **NO** tienen este problema: otro dominio registrable, la cookie no se les envía. El riesgo es **el espacio `*.proxima.pe` de tiendas**.

Como **todo** `*.proxima.pe` es territorio de tiendas, **no existe ninguna cookie `Domain=.proxima.pe`** que sirva a la suite sin filtrarse a las tiendas. La suite necesita un **namespace reservado propio**.

## Decisión 1 — la suite baja a `*.app.proxima.pe`; las tiendas no se tocan

Mover el **back-office** (no las tiendas). Las tiendas son el activo de marketing (las ve el cliente final del comercio) y se quedan en `{slug}.proxima.pe`. La suite (la usa el comerciante) baja un nivel:

| | Hoy | Decisión |
|---|---|---|
| Tiendas (público) | `{slug}.proxima.pe` | **`{slug}.proxima.pe`** *(intacto)* |
| Hub | `app.proxima.pe` | `app.proxima.pe` *(intacto)* |
| Admin / POS / Builder / Intelligence | `admin.proxima.pe` … | `admin.app.proxima.pe` … |
| API | `api.proxima.pe` | `api.app.proxima.pe` |
| **Cookie de sesión** | `Domain=.proxima.pe` | **`Domain=.app.proxima.pe`** |

**Por qué cierra el hueco:** la cookie `Domain=.app.proxima.pe` se envía a `app.proxima.pe` y a `*.app.proxima.pe` (toda la suite), pero **`pepito.proxima.pe` no está bajo `.app.proxima.pe`** (es hijo directo de `proxima.pe`) → **no recibe la cookie**, y sus requests a la API salen sin credenciales → sin CSRF.

**Por qué es barato:** nada está desplegado todavía → es solo config: DNS `*.app.proxima.pe`, cert `*.app.proxima.pe`, `config.json` (apiBaseUrl → `api.app.proxima.pe` + URLs del app-switcher), `COOKIE_DOMAIN=.app.proxima.pe`, regex de CORS. Cero migración de datos, cero impacto al cliente final del comercio.

**Por qué no hay alternativa más barata:** la suite necesita un padre común que las tiendas no compartan. Si admin/hub se quedan como hermanos de `{slug}.proxima.pe` (hijos directos de `proxima.pe`), ninguna `Domain` incluye la suite y excluye las tiendas. Por eso baja a `*.app.proxima.pe`. (Un dominio registrable separado — `proxima.app` — también sirve pero es más caro; `.app.proxima.pe` basta.)

## Decisión 2 — reservar slugs de subdominio (obligatorio)

Como los slugs de tienda son libres, la plataforma MUST **bloquear** que un comercio registre slugs de infraestructura. Si un comercio tomara **`app.proxima.pe`**, controlaría el **dominio padre de la cookie** → comprometería toda la suite. Igual de peligrosos: `api`, `admin`, `pos`, `builder`, `intelligence`, `www`, `mail`, `cdn`, `media`, `static`, `assets`, `id`, `auth`, `login`, `hub`, `dashboard`, `status`, `help`, `docs`, `blog`.

Blocklist de slugs reservados aplicada en el alta/cambio de subdominio de tienda (case-insensitive, normalizado). El auto-sugeridor de slug tampoco MUST producir uno reservado.

## Decisión 3 — defensa en profundidad (independiente del dominio)

Aunque la separación de dominio cierra el vector principal, se endurece igual:

1. **`validateNextUrl` con allowlist explícita.** No aceptar cualquier `*.proxima.pe`; solo los hosts de la suite (`app.proxima.pe`, `admin.app.proxima.pe`, `pos.app.proxima.pe`, `builder.app.proxima.pe`, `intelligence.app.proxima.pe`), config-driven; + dev `*.proxima.test`/`localhost`.
2. **No token en la URL en modo cookie.** El `auth.store`/`select-business` del Hub agrega `?sso=`/`?sso_refresh=`/`sso_business=` **solo si `!IS_COOKIE_AUTH`**. En prod (cookie), el salto cross-app no lleva token en la URL → no se filtra a logs de CloudFront ni al `Referer`. La cookie compartida autentica (ya validado E2E).
3. **CSRF para cookie-auth.** El guard/middleware del API valida `Origin`/`Referer` contra la allowlist de suite en mutaciones autenticadas por **cookie** (no por `Authorization: Bearer`, que no es CSRF-able). Origen no-suite → 403.

## Qué NO cambia
- Logout/revocación de sesión (verificado correcto: el guard valida `sid` activo en cada request).
- Login del Hub, OTP, Turnstile.
- El handoff `?sso=` en **dev** (donde la cookie cross-origin es más friccionosa).
- Las tiendas de comercios en `{slug}.proxima.pe` (intactas).
