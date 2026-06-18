## ADDED Requirements

### Requirement: El Hub es el único destino de las acciones de pago
Toda acción de upgrade/compra de plan de la suite SHALL rutear al Hub (`${hubUrl}/plan`). Los apps de producto (admin, pos) y las superficies del Hub NO MUST tener su propio checkout/cobro; las paredes de pago (feature gates, paywalls, apps add-on bloqueadas) MUST redirigir al Hub.

#### Scenario: Un gate de admin lleva al Hub
- **WHEN** un usuario topa con un feature gateado en admin
- **THEN** es redirigido a `${hubUrl}/plan?feature=<key>`, no a una página de pago propia de admin

#### Scenario: Una app add-on bloqueada lleva al Hub
- **WHEN** un usuario hace click en una app add-on bloqueada (Tienda Web, Intelligence) en el Hub
- **THEN** va a `${hubUrl}/plan?plan=<id>`, no a `admin/premium`

### Requirement: Deep-link del catálogo de planes
El Hub `/plan` SHALL aceptar `?plan=<id>` (pre-selecciona ese plan) y `?feature=<key>` (resuelve y pre-selecciona el plan más barato cuyas `features` incluyen esa key). Si los params son inválidos, MUST mostrar el catálogo normal sin error.

#### Scenario: Deep-link por feature
- **WHEN** se abre `${hubUrl}/plan?feature=invoicing`
- **THEN** el plan más barato que incluye facturación queda pre-seleccionado y resaltado

### Requirement: Gestión completa de la suscripción en el Hub
El Hub `/plan` SHALL ofrecer al usuario: ver el plan actual y uso, **mejorar** (upgrade), **bajar de plan** (downgrade), **cancelar**, gestionar **add-ons**, y ver el **historial de pagos** — todo desde un solo lugar.

#### Scenario: Downgrade
- **WHEN** el usuario elige un plan menor
- **THEN** el cambio se registra (`POST /billing/subscription/change`) y aplica al fin del período actual

### Requirement: Cancelación self-serve que respeta el período pagado
`POST /billing/subscription/cancel` SHALL cancelar el preapproval en MercadoPago y marcar la suscripción `cancelled`, manteniendo la cobertura hasta `current_period_end`; al expirar, el negocio vuelve a FREE. MUST ser idempotente.

#### Scenario: Cancelar mantiene el acceso hasta fin de período
- **WHEN** el usuario cancela su suscripción de pago
- **THEN** la suscripción queda `cancelled` pero conserva acceso hasta el fin del período pagado
- **WHEN** el período expira
- **THEN** el negocio queda en FREE
