# Tasks — platform-app-shell

> Plan por fases. Cada fase es desplegable/validable por separado. **Regla de oro:** no cortar el login de admin/pos hasta que el Hub esté en prod y validado E2E (Fase 6+).

## Fase 0 — Scaffold del repo `proxima-hub`
- [ ] 0.1 `ng new proxima-hub` (Angular 21, standalone, routing, sin SSR), pnpm.
- [ ] 0.2 Instalar PrimeNG 21 + Tailwind v4 + `tailwindcss-primeui`; configurar `providePrimeNG`.
- [ ] 0.3 Portar el design system de admin: `styles/themes/*` (tokens `--theme-*`, `--px-*`), fuentes (Fraunces + Plus Jakarta + Inter en `index.html`), focus-ring global.
- [ ] 0.4 `RuntimeConfigService` + `public/config.json` (apiBaseUrl, turnstileSiteKey, adminUrl, builderUrl, posUrl, intelligenceUrl, mobileUrl) + APP_INITIALIZER.
- [ ] 0.5 HTTP interceptors base (api-base, error, loading) + `SUPPRESS_ERROR_TOAST` token.
- [ ] 0.6 CI + deploy (Cloudflare Pages, alineado con storefront) → `app.proxima.pe` (dev: `app.localhost`).

## Fase 1 — Fundación de auth (interna por ahora)
- [ ] 1.1 Portar de admin: `auth.service`, `auth-token.storage`, `token-refresh.service`, `business-context.service`, `auth-error.utils`.
- [ ] 1.2 Guards: `auth`, `guest`, `token`, `business`.
- [ ] 1.3 Interceptors: `auth-bearer`, `auth-refresh`, `business-header`.
- [ ] 1.4 Utilidad `validateNextUrl` con **allowlist `*.proxima.pe`** (+ localhost en dev) — anti open-redirect.
- [ ] 1.5 Handoff SSO `?sso=`/`?sso_refresh=` (portar de `auth.store`).

## Fase 2 — Identidad (mover páginas de admin)
- [ ] 2.1 `/login` (+ login Google) → `POST /auth/login`, `/auth/social/google`.
- [ ] 2.2 `/registro` — **mover** `proxima-admin/features/registro` tal cual (wizard + OTP + Turnstile). Cablear `RegistroApiService` (`/auth/register/start|verify|resend`).
- [ ] 2.3 `/recuperar` (forgot) → `POST /auth/forgot-password`.
- [ ] 2.4 `/restablecer` (reset) → `POST /auth/reset-password`.
- [ ] 2.5 `/verificar` (verify-email) + reenvío → `POST /auth/verify-email`, `/resend-verification`.
- [ ] 2.6 `/activar` (setup/invitación) → set-password.
- [ ] 2.7 `/elegir-negocio` (select-business) → `GET /me/businesses`; 1 negocio = entra directo al Hub.
- [ ] 2.8 Post-login: redirige a `next` (validado) o al Hub home.
- [ ] 2.9 Banner "verifica tu correo" (componente reutilizable).

## Fase 3 — Hub home (launcher)
- [ ] 3.1 Shell del Hub: barra superior (wordmark + selector de negocio + avatar de cuenta).
- [ ] 3.2 **App-switcher**: tarjetas (Panel/Caja/Tienda/Intelligence/App) desde runtime config + gating por entitlements (`GET /me` / billing → badge "Add-on" en los bloqueados). Cada link entra con la cookie (SSO).
- [ ] 3.3 Checklist de onboarding → `GET /admin/business/status` (progreso + ítems + next-action).
- [ ] 3.4 Card de plan + uso → `GET /billing/subscription` (plan, cuotas vs uso); CTA "Salir en vivo".
- [ ] 3.5 Diseño premium (el ya aprobado): claro/editorial/Fraunces/plano. 0 AXE.

## Fase 4 — Cuenta / organización (migrar settings de cuenta)
- [ ] 4.1 `/cuenta` (perfil: nombre, correo, cambiar contraseña → `/auth/change-password`).
- [ ] 4.2 `/plan` (detalle de plan, uso, add-ons, "mejorar").
- [ ] 4.3 `/seguridad` (sesiones activas, cerrar sesión en dispositivos).
- [ ] 4.4 `/equipo` (miembros + roles) → endpoints de identity team.
- [ ] 4.5 Quitar estas secciones de `proxima-admin` settings (quedan Negocio/Sedes).

## Fase 5 — Librería `@proxima/auth`
- [ ] 5.1 Crear repo `proxima-auth` (Angular library, ng-packagr).
- [ ] 5.2 Extraer la fundación de auth (Fase 1) a la lib; API pública (`provideProximaAuth()`, guards, interceptors, tokens).
- [ ] 5.3 Publicar a **GitHub Packages** (`@proxima/auth`) vía CI; `.npmrc` documentado.
- [ ] 5.4 `proxima-hub` consume la lib (reemplaza la copia interna).

## Fase 6 — Adelgazar `proxima-admin` (change: admin-delegate-auth)
- [ ] 6.1 Admin consume `@proxima/auth`.
- [ ] 6.2 Guard: sin sesión → redirige a `app.proxima.pe/login?next=`. **Eliminar** `features/login`, `features/auth` (login/forgot/reset/verify/setup), `features/select-business`.
- [ ] 6.3 Sidebar/menú: "Mi cuenta/Plan/Equipo/Seguridad" enlazan al Hub.
- [ ] 6.4 Validar que admin sigue funcionando con sesión venida del Hub.

## Fase 7 — Adelgazar `proxima-pos` (change: pos-delegate-auth)
- [ ] 7.1 POS consume `@proxima/auth` (o el mínimo de token+redirect).
- [ ] 7.2 Eliminar `pos-auth` login + `features/login`; delegar al Hub (web) / deep-link (desktop Tauri).

## Fase 8 — Backend (change: app-shell-cookie-cors)
- [ ] 8.1 CORS: permitir origen `https://app.proxima.pe` (+ `app.localhost` en dev).
- [ ] 8.2 Cookie: confirmar `Domain=.proxima.pe`, `Secure`, `SameSite=Lax` en prod.
- [ ] 8.3 (Opcional) endpoint/util de validación de `next` server-side si se centraliza ahí.

## Fase 9 — Marketing handoff
- [ ] 9.1 `proxima.pe`: "Empieza gratis" → `app.proxima.pe/registro?plan=&plantilla=`; "Ingresar" → `app.proxima.pe/login`.

## Fase 10 — Validación E2E (suite completa)
- [ ] 10.1 Registro en Hub → cuenta + redirige al Hub home.
- [ ] 10.2 Desde el Hub, abrir admin/builder/pos → **sin re-login** (SSO).
- [ ] 10.3 Entrar directo a `admin.proxima.pe` sin sesión → redirige al Hub → vuelve.
- [ ] 10.4 Logout en el Hub → cierra sesión en todos los apps.
- [ ] 10.5 A11y (AXE 0) + foco/teclado en todas las páginas de identidad y el Hub.
