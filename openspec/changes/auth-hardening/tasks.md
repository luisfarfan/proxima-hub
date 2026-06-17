# Tasks — auth-hardening

> Prioridad: cerrar el límite de confianza antes del deploy. Decisión tomada (design.md): suite a `*.app.proxima.pe`, tiendas intactas en `{slug}.proxima.pe`, + blocklist de slugs reservados.

## 1. Suite bajo `*.app.proxima.pe` (ALTO — infra + config)
- [ ] 1.1 DNS: `admin.app.proxima.pe`, `pos.app.proxima.pe`, `builder.app.proxima.pe`, `intelligence.app.proxima.pe`, `api.app.proxima.pe` (hub se queda en `app.proxima.pe`). Tiendas siguen en `{slug}.proxima.pe`.
- [ ] 1.2 Cert ACM `*.app.proxima.pe`; actualizar los stacks static (admin/builder/hub) + el host del API para los nuevos hostnames.
- [ ] 1.3 `COOKIE_DOMAIN=.app.proxima.pe` en el env de prod del API.
- [ ] 1.4 `config.json` de cada app: `apiBaseUrl` → `https://api.app.proxima.pe`; `adminUrl`/`posUrl`/`builderUrl`/`intelligenceUrl` del Hub → `*.app.proxima.pe`.
- [ ] 1.5 CORS regex del API → `^https://([a-z0-9-]+\.)?app\.proxima\.pe$` (suite). Las tiendas NO llaman a la API de suite.
- [ ] 1.6 Documentar en `proxima-infra/INFRASTRUCTURE.md`.

## 2. Slugs reservados (ALTO — `proxima-api`) ✅
- [x] 2.1 Blocklist de slugs de infraestructura — extendida en `src/modules/acquisition/reserved_slugs.py` (añadidos `auth`, `id`, `hub`, `pos`, `builder`, `intelligence`, `dashboard`, `media`, `docs`, `blog`; `app`/`api`/`admin` ya estaban). Case-insensitive vía `normalize_slug`.
- [x] 2.2 Ya aplicada: `HostNamespaceService.validate_format` → `"RESERVED"`, y `suggest()` hace `continue` sobre reservados (nunca los produce).
- [x] 2.3 Test `test_reserved_words_cover_suite_and_cookie_parent` en `tests/unit/acquisition/test_host_namespace.py` (8/8 verde).

## 3. Allowlist estricta de `next` (MEDIO — `@proxima/auth`)
- [ ] 3.1 `validateNextUrl`: aceptar solo hosts de suite explícitos en prod (`app.proxima.pe`, `*.app.proxima.pe`), no cualquier `*.proxima.pe`. Config-driven. Conservar `*.proxima.test`/`localhost` en dev.
- [ ] 3.2 Test: `next=https://pepito.proxima.pe` rechazado; `next=https://admin.app.proxima.pe` aceptado.

## 4. No token en la URL en modo cookie (MEDIO — Hub + apps)
- [ ] 4.1 `proxima-hub/auth.store` y `select-business`: agregar `?sso=`/`?sso_refresh=`/`sso_business=` **solo si `!IS_COOKIE_AUTH`**.
- [ ] 4.2 Verificar que admin/builder/pos siguen entrando solo con la cookie en modo cookie (ya validado para admin).

## 5. CSRF para cookie-auth (defensa en profundidad — `proxima-api`)
- [ ] 5.1 Para mutaciones autenticadas por **cookie** (no Bearer header), validar `Origin`/`Referer` contra la allowlist de suite; 403 si no pertenece.
- [ ] 5.2 No aplicar a `Authorization: Bearer` (no es CSRF-able).
- [ ] 5.3 Tests: origen de tienda con cookie → 403 en mutación; origen de suite → OK.

## 6. Validación
- [ ] 6.1 E2E: la cookie de suite NO se envía a un origen de tienda `{slug}.proxima.pe`.
- [ ] 6.2 E2E: ningún token en la URL tras el salto cross-app en modo cookie (history + Referer).
- [ ] 6.3 Slug reservado bloqueado en alta de tienda.
