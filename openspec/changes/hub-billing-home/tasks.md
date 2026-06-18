# Tasks — hub-billing-home

> Fases ordenadas por impacto/esfuerzo. La 1 cierra el funnel con poco (el checkout ya existe).

## 1. Funnel unificado + deep-link (ALTO impacto, bajo esfuerzo)
- [x] 1.1 Hub `/plan`: aceptar `?plan=<id>` (pre-selecciona + resalta) y `?feature=<key>` (resuelve el plan más barato que incluye la feature, vía plan `features`).
- [x] 1.2 Hub home: apps add-on bloqueadas → `/plan?feature=<key>` (antes abrían `admin/premium`). "Salir en vivo" también rutea a `/plan`.
- [ ] 1.3 admin `feature.guard` + paywall overlays → redirigir a `${hubUrl}/plan?feature=<key>` en vez de `/premium`.
- [ ] 1.4 admin `/premium` → redirect a `${hubUrl}/plan?feature=<key>` (deprecación suave, no borrar aún).

## 2. Downgrade (UI)
- [x] 2.1 Hub `/plan`: acción "cambiar a plan menor" sobre `POST /billing/subscription/change`; aplica al fin del período.
- [x] 2.2 Confirmación inline + aviso de qué se pierde (features/quotas).

## 3. Cancelar suscripción
- [ ] 3.1 API: `POST /billing/subscription/cancel` (cancela preapproval en MP + marca `cancelled`, mantiene acceso hasta `current_period_end`, idempotente).
- [x] 3.2 Hub `/plan`: botón "Cancelar suscripción" + confirmación ("mantienes acceso hasta <fecha>").
- [ ] 3.3 Tests: cancel → preapproval cancelado en MP + cobertura hasta fin de período + vuelve a FREE al expirar.

## 4. Add-ons (UI)
- [ ] 4.1 API: endpoints self-serve de add-on (contratar/cancelar) si faltan (sobre `addon_definitions`: tienda_web, precios_inteligentes). Hub consume `POST billing/addon/checkout` y `POST billing/addon/cancel`.
- [x] 4.2 Hub `/plan` (sección add-ons): contratar (checkout) / cancelar Tienda Web e Intelligence.

## 5. Historial de pagos (UI)
- [x] 5.1 Hub `/plan`: tabla de pagos desde `GET /billing/subscription/payments` (fecha, monto, estado, método).

## 6. Validación
- [ ] 6.1 E2E: desde un gate de admin → aterriza en `${hubUrl}/plan` con el plan correcto pre-seleccionado.
- [ ] 6.2 E2E: cancelar → la suscripción queda `cancelled` y el acceso se mantiene hasta el fin del período.
