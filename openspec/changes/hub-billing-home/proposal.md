## Why

El **upgrade** de plan ya funciona (Hub `/plan` → `POST /billing/checkout` → MercadoPago, validado en vivo). Pero el flujo de billing está **fragmentado**:

- Los momentos de alta intención (feature gates y paywalls en admin, apps add-on bloqueadas en el Hub) rutean a **`admin/premium`** — una página del modelo viejo (pitch + mailto) que **NO cobra**. El usuario topa la pared de pago pero el botón que realmente cobra vive en otra app.
- Faltan las demás acciones de gestión que el usuario espera en su "centro de plan": **downgrade**, **cancelar**, **add-ons** (Tienda Web / Intelligence), **historial de pagos**.

Como la identidad y la cuenta ya se centralizaron en el Hub (ver `platform-app-shell` / `account-billing-hub`), el Hub debe ser el **centro único de billing**, y **toda la suite rutea ahí**.

## What Changes

- **Funnel unificado:** todas las puertas de upgrade (feature gates de admin, paywall overlays, apps add-on bloqueadas en el Hub, card de plan del Hub) rutean a **`${hubUrl}/plan`** — no a `admin/premium`.
- **Deep-link:** `/plan?plan=<id>` y `/plan?feature=<key>` para **pre-seleccionar** el plan correcto según de dónde vino el usuario (si chocó con "facturación", lo lleva al plan que la incluye y resalta).
- **Downgrade:** UI en el Hub `/plan` sobre el endpoint existente `POST /billing/subscription/change`.
- **Cancelar suscripción:** endpoint self-serve (`POST /billing/subscription/cancel`) + UI ("cancelar, mantienes acceso hasta el fin del período").
- **Add-ons:** contratar/cancelar Tienda Web e Intelligence desde el Hub (sobre `addon_definitions` / billing-addons).
- **Historial de pagos:** mostrar `GET /billing/subscription/payments` en el Hub.

## Non-goals
- Reescribir el provider de pagos / el flujo de checkout MercadoPago (ya hecho y validado).
- Billing de plataforma/operador (suspend/reactivate/assign — vive en el panel de plataforma).
- Cambiar el modelo de entitlements/planes/addons (se consume, no se rediseña).

## Capabilities

### New Capabilities
- `hub-billing-home`: el Hub es el centro único de gestión de plan (catálogo, upgrade, downgrade, cancelar, add-ons, historial) y toda la suite rutea sus CTAs de pago hacia él.

## Impact
- `proxima-hub`: `/plan` (downgrade, cancelar, add-ons, historial, deep-link), card de plan del Hub home.
- `proxima-admin`: `feature.guard`, paywall overlays y la página `/premium` → rutean a `${hubUrl}/plan?…` (deprecación del checkout/pitch propio).
- `proxima-api`: endpoint `POST /billing/subscription/cancel` (self-serve) + endpoints self-serve de add-ons si faltan.
- Apps add-on bloqueadas (Hub home `home.component`) → `${hubUrl}/plan?plan=…` en vez de `admin/premium`.
