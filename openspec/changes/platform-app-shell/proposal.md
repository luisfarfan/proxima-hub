## Why

Próxima es una **suite** (Panel/ERP, Tienda/Builder, Caja/POS, App mobile, Intelligence), no una sola app. Hoy `proxima-admin` mezcla tres cosas que no le corresponden: **identidad** (login/registro), **launcher** entre apps, y **cuenta/billing**. Eso acopla la capa transversal a un producto, hace que cada app deba resolver auth por su cuenta (login duplicado en admin y en pos), y deja sin "casa" al onboarding y al app-switcher.

Las SaaS que son suites resuelven esto con una **capa de cuenta/launcher** dedicada (Atlassian `home.atlassian.com`, Google accounts + app-grid, Microsoft 365, Zoho One): **una sola identidad**, un lugar para aterrizar y saltar entre productos. Esta propuesta crea esa capa: **`proxima-hub` en `app.proxima.pe`**.

## What Changes

- **Nuevo app `proxima-hub`** (Angular 21, mismo design system que `/registro`) servido en **`app.proxima.pe`**: identidad centralizada + launcher + cuenta.
- **Identidad centralizada (SSO):** login, registro (+OTP), recuperar/restablecer/verificar correo, activar cuenta, elegir-negocio — viven **solo** en el Hub. Los apps de producto **pierden su login** y delegan vía `?next=` + cookie compartida `.proxima.pe` (ADR-013, ya existe).
- **Hub / launcher:** app-switcher (con gating por entitlements), checklist de onboarding (`business_status`), card de plan + uso, CTA "Salir en vivo".
- **Cuenta/organización:** migrar settings de cuenta (perfil, plan/billing, seguridad/sesiones, equipo) de admin → Hub. (Negocio/Sedes se quedan en admin.)
- **Librería `@proxima/auth`** (Angular lib, GitHub Packages): lógica de auth compartida por hub/admin/pos, para no triplicar.
- **Adelgazar `proxima-admin` y `proxima-pos`:** eliminar formularios de login, dejar solo "sin sesión → redirige al Hub".
- **Backend (`proxima-api`):** sin reescritura — solo CORS/cookie para el nuevo subdominio + allowlist de `next`. `/auth/*` ya es la API de identidad compartida.
- **Marketing (`proxima.pe`):** apuntar los CTAs "Empieza gratis"/"Ingresar" a `app.proxima.pe`.

## Non-goals (fuera de este change)
- Paywall + cobro MercadoPago (el CTA "Salir en vivo" lleva ahí; el flujo de pago es un change aparte).
- Provisioning (subdominio/SUNAT/WhatsApp).
- Reescribir el backend de identidad (ya está y se reutiliza).
- Migrar la app mobile (Flutter) a este SSO web (puede venir después con OAuth nativo).

## Capabilities

### New Capabilities
- `centralized-identity`: login/registro/recuperar/verificar/activar/elegir-negocio centralizados en el Hub + el modelo SSO (delegación desde apps de producto, cookie `.proxima.pe`, allowlist `next`).
- `hub-launcher`: el home del Hub — app-switcher con gating por entitlements, checklist de onboarding, card de plan/uso, CTA "Salir en vivo".
- `account-billing-hub`: settings de cuenta migrados (perfil, plan/billing, seguridad/sesiones, equipo).
- `shared-auth-library`: `@proxima/auth` — paquete Angular con la lógica de auth, distribuido por GitHub Packages, consumido por hub/admin/pos.

## Impact

- **Nuevo repo `proxima-hub`** (scaffold Angular + design system + deploy/CI).
- **`proxima-admin`:** elimina rutas/componentes de login (`features/login`, `features/auth`, `features/select-business`), settings de cuenta migran; agrega guard "redirige al Hub". (Change propio: `admin-delegate-auth`.)
- **`proxima-pos`:** elimina su login (`pos-auth` login + `features/login`); delega al Hub. (Change propio: `pos-delegate-auth`.)
- **`proxima-api`:** CORS/cookie para `app.proxima.pe`; valida `next` allowlist. (Change propio: `app-shell-cookie-cors`.)
- **`proxima-website`:** CTAs → `app.proxima.pe`.
- **Nuevo repo `proxima-auth`** (la lib) + GitHub Packages.
