# Plan — Validaciones en tiempo real: Registro (email + RUC)

## Contexto

El formulario de registro (`/register`) valida email y RUC únicamente al hacer submit.
Esto hace que el usuario complete 3 pasos antes de descubrir que el correo ya existe,
y no tiene forma de confirmar un RUC antes de terminar.

Se añaden dos validaciones progresivas:
- **Email** (step 2): unicidad con debounce 700ms al digitar
- **RUC** (step 1): lookup SUNAT vía botón cuando el campo tiene 11 dígitos

Ambas requieren nuevos endpoints públicos en `proxima-api`.

---

## Grafo de dependencias

```
Slice 1 (email)          Slice 2 (RUC)
  API: check-email   →     API: lookup-ruc
  FE: debounce       →     FE: botón verificar

Los dos slices son independientes entre sí.
Cada FE depende de su API respectiva.
```

---

## Slice 1 — Email check

### API (`proxima-api`)

**Archivo:** `src/modules/identity/api/router.py`  
**Schema:** `src/modules/identity/api/schemas.py`

```
GET /api/v1/auth/check-email?email=
Rate limit: 20/minute por IP  (via @limiter.limit existente)
Auth: ninguna
```

**Response:**
```json
{ "available": true, "reason": "AVAILABLE" }
{ "available": false, "reason": "EMAIL_TAKEN" }
{ "available": false, "reason": "DISPOSABLE_EMAIL" }
```

**Lógica (en orden):**
1. Lowercase + strip el email
2. `is_disposable_email(email)` → ya importado en el módulo
3. `await user_repo.get_by_email(email)` → ya usado en `_prepare_self_serve_registration`

**Reutiliza (no crear):**
- `limiter` — `src/core/monitoring.py`
- `is_disposable_email` — `src/core/security/disposable_emails.py`
- `user_repo.get_by_email()` — misma llamada de registro
- Inyección DI con `@inject` + `Provide[Container.identity_module.user_repository]`

---

### Frontend (`proxima-hub`)

**`registro-api.service.ts`**
```ts
checkEmail(email: string): Observable<{ available: boolean; reason: string }>
// GET auth/check-email?email=... con guestOptions
```

**`registro-page.component.ts`**
- Signal: `emailStatus = signal<'idle'|'checking'|'ok'|'taken'|'disposable'>('idle')`
- En constructor: suscripción a `cuenta.controls.email.valueChanges` con
  `debounceTime(700)` → `distinctUntilChanged()` → `filter(valid)` → `switchMap(checkEmail)`
  → `takeUntilDestroyed()`
- Reset a `'idle'` cuando el email pasa a formato inválido
- `canContinue` step 2: añadir `&& this.emailStatus() !== 'taken' && this.emailStatus() !== 'disposable'`

**`registro-page.component.html` (step 2, campo email)**
- Debajo del input: spinner si `'checking'`, check verde si `'ok'`,
  error inline si `'taken'` o `'disposable'`
- El signal `emailTaken()` existente (fallback de 409 en submit) se mantiene

---

## Slice 2 — RUC lookup

### API (`proxima-api`)

**Archivo:** `src/modules/identity/api/router.py`  
**Schema:** `src/modules/identity/api/schemas.py`

```
GET /api/v1/auth/lookup-ruc?ruc=    (11 dígitos exactos, solo números)
Rate limit: 5/minute por IP
Auth: ninguna
503 → APISUNAT_PLATFORM_TOKEN no configurado
404 → RUC_NOT_FOUND
```

**Response:**
```json
{ "ruc": "20100070970", "razon_social": "TELEFONICA DEL PERU S.A.A.", "estado": "ACTIVO", "condicion": "HABIDO" }
```

**Lógica:**
1. Verificar `settings.APISUNAT_PLATFORM_TOKEN` → 503 si ausente
2. `ApisunatClient(token=..., environment=settings.APISUNAT_PLATFORM_ENVIRONMENT).get_business_ruc(ruc)`
3. `FiscalIdentityLookupRead.from_ruc_payload()` para parsear la respuesta
4. `InvoicingGatewayError` con `is_transient=True` → 503; `is_transient=False` → 404

**Reutiliza (no crear):**
- `ApisunatClient` — `src/modules/invoicing/infrastructure/apisunat/client.py`
- `FiscalIdentityLookupRead.from_ruc_payload()` — `src/modules/invoicing/schemas.py`
- `InvoicingGatewayError` — `src/modules/invoicing/domain/ports.py`
- `settings.APISUNAT_PLATFORM_TOKEN` + `APISUNAT_PLATFORM_ENVIRONMENT` — config existente

---

### Frontend (`proxima-hub`)

**`registro-api.service.ts`**
```ts
lookupRuc(ruc: string): Observable<{ ruc: string; razon_social: string; estado: string|null; condicion: string|null }>
// GET auth/lookup-ruc?ruc=... con guestOptions
```

**`registro-page.component.ts`**
- Signal: `rucLookup = signal<{status:'idle'|'loading'|'ok'|'not_found'|'error'; data?: {...}}>({status:'idle'})`
- Computed: `canVerifyRuc = computed(() => /^\d{11}$/.test(this.negocio.controls.ruc.value ?? ''))`
- Método `verifyRuc()`: set `loading` → subscribe → set `ok` / `not_found` / `error`
- Effect o valueChanges: reset `rucLookup` a `idle` cuando el campo ruc cambia

**`registro-page.component.html` (step 1, bloque `@if hasRuc`)**
Junto al campo RUC, después del input:
- Botón "Verificar RUC" — `[disabled]="!canVerifyRuc() || rucLookup().status === 'loading'"`
- `@if ok` → razón social + estado (solo lectura, no pre-llena el nombre del negocio)
- `@if not_found` → "RUC no encontrado en SUNAT."
- `@if error` → "No se pudo consultar el RUC. Inténtalo de nuevo."

---

## Archivos a modificar

### proxima-api (2 archivos)
| Archivo | Cambio |
|---|---|
| `src/modules/identity/api/router.py` | +2 endpoints en `auth_router` |
| `src/modules/identity/api/schemas.py` | +`EmailAvailabilityResponse`, +`RucLookupResponse` |

### proxima-hub (4 archivos)
| Archivo | Cambio |
|---|---|
| `src/app/features/identity/registro/registro-api.service.ts` | +`checkEmail()`, +`lookupRuc()` |
| `src/app/features/identity/registro/registro-page.component.ts` | +signals, +debounce pipe, +`verifyRuc()` |
| `src/app/features/identity/registro/registro-page.component.html` | +email status UI, +RUC button/resultado |
| `src/app/features/identity/registro/registro-page.component.css` | +estilos mínimos |

---

## Criterios de aceptación

### Check email
- [ ] Digitar correo existente en step 2 → tras 700ms → error inline visible, "Continuar" bloqueado
- [ ] Digitar correo nuevo válido → tras 700ms → check verde, "Continuar" habilitado
- [ ] Digitar correo disposable → error inline "Usa un correo real…"
- [ ] Borrar el correo → status vuelve a idle, sin error
- [ ] Si el check falla (red error) → silencioso (status idle), submit aún funciona

### RUC lookup
- [ ] Campo vacío / < 11 dígitos → botón "Verificar RUC" deshabilitado
- [ ] 11 dígitos válidos → botón habilitado → click → spinner → razón social + estado
- [ ] RUC inexistente → "RUC no encontrado en SUNAT."
- [ ] Error de red → "No se pudo consultar el RUC."
- [ ] Modificar el RUC tras verificar → resultado desaparece

### Regresión
- [ ] Submit final del formulario sigue funcionando (no se rompe el flujo existente)
- [ ] El `emailTaken()` signal de 409 sigue funcionando como fallback
