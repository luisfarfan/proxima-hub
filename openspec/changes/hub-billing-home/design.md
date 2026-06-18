# Design — hub-billing-home

## Principio: un flujo, muchas puertas

El **checkout** (cobrar) vive en un solo lugar — el Hub `/plan`. Todo lo demás son **puertas** que llevan ahí con contexto. Hoy las puertas mueren en `admin/premium` (pitch sin cobro); el fix es que todas apunten al Hub.

```
[feature gate admin] ─┐
[paywall overlay]     ├─→  ${hubUrl}/plan?feature=<key>  ─→  /plan resuelve el plan que
[app add-on bloqueada]├─→  ${hubUrl}/plan?plan=<id>          incluye esa feature/app y
[card de plan Hub]    ─┘                                     pre-selecciona + resalta
                                                                      │
                                                            (botón Elegir) → POST /billing/checkout → MP
```

## Deep-link `/plan`

`/plan` acepta query params (opcionales):
- `?plan=<id>` → pre-selecciona ese plan (scroll + highlight + CTA primario).
- `?feature=<key>` → el Hub resuelve **el plan más barato que incluye esa feature** (vía entitlements/plan features) y lo pre-selecciona.
- `?status=success|failure` → ya existe (retorno de MercadoPago); refresca la suscripción.

Mapa `feature → plan` se deriva de las `features` de cada plan (no se hardcodea): el primer plan del ladder cuya `features[key]` sea true.

## Acciones de gestión (todas en `/plan`)

| Acción | Endpoint | Nota |
|---|---|---|
| **Upgrade** | `POST /billing/checkout` | ✅ ya hecho (MercadoPago) |
| **Downgrade** | `POST /billing/subscription/change` | ya existe; downgrade aplica al fin del período (no prorratea a favor) |
| **Cancelar** | `POST /billing/subscription/cancel` (nuevo) | cancela el preapproval en MP + marca `cancelled`; acceso hasta fin de período |
| **Add-ons** | self-serve sobre `addon_definitions` (tienda_web, precios_inteligentes) | contratar = checkout del add-on; cancelar = quitar entitlement al fin de período |
| **Historial** | `GET /billing/subscription/payments` | ya existe; render tabla |

## Cancel — contrato

`POST /billing/subscription/cancel`:
- Cancela el preapproval en MercadoPago (`provider_subscription_id`).
- Marca la suscripción `cancelled` pero **mantiene la cobertura hasta `current_period_end`** (no degrada inmediato).
- Al expirar el período, vuelve a FREE (reusa el lifecycle existente).
- Idempotente; 200 si ya estaba cancelada.

## Qué NO cambia
- El provider de MercadoPago y el flujo de checkout (hecho).
- El modelo de planes/entitlements/addons (se consume).
- El billing de plataforma (operador): suspend/reactivate/assign siguen en el panel de plataforma.

## Deprecación de `admin/premium`
La página `admin/premium` y su feature.guard dejan de ser el destino de pago: se convierten en **redirect** a `${hubUrl}/plan?feature=<key>`. (No se borra de golpe hasta confirmar que todas las puertas apuntan al Hub — regla de oro de la migración de identidad.)
