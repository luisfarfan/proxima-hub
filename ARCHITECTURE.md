# proxima-hub — Arquitectura (`app.proxima.pe`)

> **Qué es:** el **Hub web** de Próxima — la cara de presentación. Centraliza **identidad** (login, registro, recuperar/verificar correo), el **launcher** de productos (app-switcher), y la **cuenta** (plan, billing, equipo, seguridad) de toda la suite.
> **Qué NO es:** un ERP. Es una *front door* delgada. Lo pesado vive en los apps de producto.

---

## 1. Por qué existe (la decisión)

Próxima es una **suite de productos** (Panel/ERP, Tienda/Builder, Caja/POS, App mobile, Intelligence), no una sola app. Las SaaS que son suites usan el patrón **capa de cuenta/launcher + apps de producto** (Atlassian `home.atlassian.com`, Google `accounts` + app-grid, Microsoft 365, Zoho One). El Hub:

- Es el **lugar donde aterrizas** tras registrarte/loguearte y desde donde **saltas** a cada producto con una sola sesión.
- Es **product-neutral**: un bodeguero que quiere una *tienda* (builder) no debería aterrizar en el ERP. Aterriza en el Hub y elige su camino.
- Posee lo **transversal** (identidad, billing, plan, equipo), que no pertenece a ningún producto en particular.

**Decisión central:** **una sola identidad / un solo login**, en `app.proxima.pe`. Los apps de producto **NO** tienen login propio — delegan al Hub. Es la práctica de mercado (Google/Atlassian/Microsoft).

---

## 2. Mapa de la suite

```
proxima.pe (marketing, estático)
      │  "Empieza gratis" → app.proxima.pe/registro   ·   "Ingresar" → app.proxima.pe/login
      ▼
app.proxima.pe  =  proxima-hub   ← identidad + launcher + cuenta/plan/billing + onboarding
   · /registro · /login · /recuperar · /verificar · /activar · /elegir-negocio
   · setea cookie HttpOnly en  .proxima.pe   ──────────┐  (SSO; ADR-013)
   · Hub: app-switcher · checklist · plan/uso          │
        ┌───────────────┬───────────────┬──────────────┼───────────────┐
        ▼               ▼               ▼              ▼               ▼
 admin.proxima.pe  builder.proxima.pe  pos.proxima.pe  (app stores)  intelligence.proxima.pe
 (ERP/Panel)       (Tienda Web)        (Caja)          proxima-app    (Intelligence)
   sin login         sin login          sin login      (Flutter)        sin login
   └─ si no hay sesión → redirige a app.proxima.pe/login?next=<destino>
```

| Repo | Subdominio | Rol |
|---|---|---|
| **proxima-hub** | **app.proxima.pe** | **Hub: identidad + launcher + cuenta** |
| proxima-admin | admin.proxima.pe | ERP / Panel |
| proxima-builder | builder.proxima.pe | Tienda Web |
| proxima-pos | pos.proxima.pe | Caja (+ desktop Tauri) |
| proxima-app | (app stores) | Mobile (Flutter) |
| proxima-api | api.proxima.pe | Backend único (no cambia) |

---

## 3. Cómo funciona el SSO (la mecánica)

La base **ya existe** (ADR-013): la cookie de sesión es **HttpOnly en `.proxima.pe`**, compartida por todos los subdominios.

1. Usuario entra a `admin.proxima.pe` **sin sesión** → el admin detecta que no hay cookie → **redirige** a `app.proxima.pe/login?next=https://admin.proxima.pe/...`.
2. Usuario se autentica en el Hub → backend setea la cookie en `.proxima.pe`.
3. Hub redirige de vuelta a `next` (validado contra **allowlist** `*.proxima.pe` — anti open-redirect).
4. El admin ya ve la cookie → entra sin re-login. Idem builder/pos.

- **Dev local** (subdominios `.localhost`): se usa el handoff `?sso=<jwt>` que ya está en `auth.store` para pasar el token entre apps cuando la cookie no cruza.
- **POS desktop (Tauri):** abre `app.proxima.pe/login` en webview → recibe el token por deep-link/callback (flujo OAuth de apps de escritorio).

**El backend `/auth/*` no cambia** — ya es la API de identidad compartida. proxima-hub es un *frontend nuevo* que la consume.

---

## 4. Qué contiene proxima-hub

### Identidad (migra de proxima-admin)
- `/login` · `/registro` (+ OTP código) · `/recuperar` (forgot) · `/restablecer` (reset) · `/verificar` (verify-email) · `/activar` (setup/invitación) · `/elegir-negocio` (select-business)
- Login social (Google), banner "verifica tu correo".

### Hub / launcher (nuevo)
- App-switcher (Panel · Caja · Tienda Web · Intelligence · App), con gating por entitlements (add-ons muestran badge).
- Checklist de onboarding → `GET /admin/business/status`.
- Card de plan + uso → `GET /billing/*`; CTA "Salir en vivo" → paywall.

### Cuenta / organización (migra de proxima-admin settings)
- **Mi cuenta** (perfil) · **Plan / billing** · **Seguridad / sesiones** · **Equipo** (miembros/roles).
- *(Negocio y Sedes se quedan en admin — son config de tienda, no de cuenta.)*

### Fundación de auth (compartida → `@proxima/auth`)
- `auth.service`, token storage, refresh, business-context, guards (auth/guest/token/business), interceptors (api-base/bearer/refresh/business-header/error), runtime-config.

---

## 5. La librería compartida `@proxima/auth`

> **Nota (2026-06-20):** la lib se **rescopeó a `@luisfarfan/auth`** y se publicó en **GitHub Packages** (repo `luisfarfan/proxima-auth`). El scope `@proxima` no se pudo usar porque esa cuenta de GitHub es de otro. Los 4 SPAs (admin/hub/pos/builder) ya la consumen del registry (`.npmrc` + `${NODE_AUTH_TOKEN}` read:packages). Donde abajo dice `@proxima/auth`, hoy es `@luisfarfan/auth`.

Auth se usa en hub + admin + pos → para no triplicar código, se extrae a una **Angular library** (ng-packagr).

- **Distribución: GitHub Packages** (registro npm privado **gratis** de GitHub) — versionado semver, `.npmrc` apuntando a `npm.pkg.github.com` + token. (Alternativa simple: git-dependency. Monorepo descartado por costo de cambio.)
- **Contenido:** servicios/guards/interceptors/token-storage/runtime-config de auth + tipos.
- **Secuencia:** primero el hub la usa interna; luego se extrae al repo `proxima-auth` y la consumen hub/admin/pos.

---

## 6. Stack y diseño

- **Angular 21** standalone + signals + OnPush · **PrimeNG 21** · **Tailwind v4**.
- **Tipografía:** Fraunces (display/headings, serif editorial) + Plus Jakarta Sans + Inter (sans).
- **Diseño:** claro, plano, editorial, premium. **Prohibido:** gradientes, glow, glass, monogramas con degradado, sombras neón. La calidad viene de tipografía, espacio y restricción. (Mismo lenguaje que `/registro` ya validado.)
- **A11y:** WCAG AA, 0 violaciones AXE, manejo de foco, ARIA correcto.

---

## 7. Plan de migración (orden recomendado)

1. **Scaffold** proxima-hub (Angular + design system + runtime config + deploy/CI).
2. **Identidad**: mover páginas de auth desde admin → hub; cablear SSO.
3. **Hub home**: launcher + checklist + plan card.
4. **Cuenta**: migrar settings de cuenta (perfil/plan/seguridad/equipo).
5. **Lib** `@proxima/auth` (extraer + GitHub Packages).
6. **Adelgazar admin**: quitar login, delegar, consumir lib.
7. **Adelgazar pos**: quitar login, delegar.
8. **Backend**: CORS/cookie para `app.proxima.pe` + allowlist `next`.
9. **Marketing**: apuntar CTAs a `app.proxima.pe`.
10. **E2E** de toda la suite (SSO cross-app).

> Detalle accionable por fases en `openspec/changes/platform-app-shell/tasks.md`.

---

## 8. Decisiones abiertas
- Nombres de rutas en español (`/recuperar`) vs inglés (`/forgot-password`) — el admin usa inglés; el hub puede unificar en español (más cercano al pyme).
- ¿`@proxima/auth` incluye también el UI (componentes de login) o solo la lógica? → recomendado: **solo lógica**; el UI vive en cada app (el hub tiene el UI canónico).
- Estrategia de deploy (Cloudflare Pages, como el storefront) y CI.
