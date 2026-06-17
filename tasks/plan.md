# Plan — Fase 4: Cuenta / Organización

## Contexto
Fases 0–3 completas: scaffold, auth, identidad, hub home. El HomeComponent actual
tiene el top bar incrustado. Esta fase extrae ese shell, añade 4 páginas de cuenta
y un shell de navegación secundaria.

---

## Decisiones de arquitectura

### 1. HubShell como layout route (Parent + router-outlet)
Extraer el top bar a `HubShellComponent`. Todos los children (home + cuenta) lo
comparten sin duplicación.

```
app.routes.ts
└── '' (HubShellComponent — top bar + <router-outlet>)
    ├── '' (pathMatch:'full') → HomeComponent
    └── '' (AccountShellComponent — nav tabs + <router-outlet>)
        ├── 'cuenta'    → CuentaPageComponent
        ├── 'plan'      → PlanPageComponent
        ├── 'seguridad' → SeguridadPageComponent
        └── 'equipo'    → EquipoPageComponent
```

### 2. CSS sin ::ng-deep
PrimeNG overrides en `src/styles/hub-prime.css` con scope
`.hub-account .p-*`. El home ya usa `registro-prime.css` con el mismo patrón.

### 3. Quota labels — Pipe compartido
`QuotaLabelPipe` mapea keys de API a español. Usado en home (card de plan) y en /plan.

### 4. Servicios — hub-first, sin copiar admin stores
No hay @ngrx/signals en el hub. Servicios propios con `resource()` y signals puros.

### 5. Endpoints reales vs stub
| Endpoint | Status esperado |
|---|---|
| GET /me | ✅ funciona (usa en home/login) |
| GET /admin/billing/subscription/status | ⚠️ CORS gap hasta Fase 8 |
| GET /billing/plans | ⚠️ CORS gap |
| GET /me/sessions | ⚠️ CORS gap |
| DELETE /me/sessions/{id} | ⚠️ CORS gap |
| GET /admin/team/members | ⚠️ CORS gap |
| GET /admin/team/roles | ⚠️ CORS gap |
| POST /auth/change-password | ⚠️ CORS gap |

Todas las páginas tienen fallback elegante; no crashean si la llamada falla.

---

## Grafo de dependencias

```
T1 (HubShell) ──┬──> T2 (AccountShell) ──┬──> T4 (/cuenta)
                │                          ├──> T5 (/plan)     ←── T3 (QuotaLabelPipe)
                │                          ├──> T6 (/seguridad)
                │                          └──> T7 (/equipo)
                └──> T3 (QuotaLabelPipe) ──> update home card
T8 (CSS + tasks.md) cierra todo
```

---

## Tareas verticales

### T1 — HubShell refactor
**Qué:** Extraer top bar de `home.component` → `hub/shell/hub-shell.component`.
- Signals movidos: `user`, `memberships`, `firstName`, `userInitial`,
  `activeBusinessName`, `activeBusinessInitial`, `accountMenuItems`
- Métodos movidos: `switchBusiness()`, `toggleAccountMenu()`
- HomeComponent queda con solo la sección `.hub-main` y su data fetching
- `app.routes.ts` restructurado: parent layout route + children
**Aceptación:** `ng serve` → home renderiza idéntico visualmente.

### T2 — AccountShell + nav tabs
**Qué:** `hub/account/account-shell.component` con nav de 4 tabs (Cuenta, Plan,
Seguridad, Equipo). Registrar rutas lazy bajo el parent HubShell.
- Nav activo por `routerLinkActive`
- Mobile: tabs horizontales con overflow-x scroll
**Aceptación:** Navegar entre tabs cambia la URL y el contenido correctamente.

### T3 — QuotaLabelPipe
**Qué:** `src/app/shared/pipes/quota-label.pipe.ts`
```
max_users → Usuarios
storage_mb → Almacenamiento
orders_per_month → Pedidos / mes
invoices_per_month → Comprobantes / mes
max_products → Productos
users → Usuarios
products → Productos
```
También actualizar `home.component.html` para usarlo en el card de plan.
**Aceptación:** Los labels en home y en /plan son legibles (no raw keys).

### T4 — /cuenta
**Qué:** `CuentaPageComponent`
- Avatar + nombre + email (del `AuthService.user()` — siempre disponible, no CORS)
- Formulario "Cambiar contraseña": current_password + new_password + confirm
  → POST /auth/change-password; toast de éxito/error via MessageService
- GoogleLinkSection (reusa `identity/google-link-section.component`)
- Añadir `changePassword()` a `auth.service.ts`
**Aceptación:** Formulario valida locales y llama al endpoint; errores se muestran.

### T5 — /plan
**Qué:** `PlanPageComponent`
- Card de plan actual: nombre, status, barras de uso con QuotaLabelPipe
- CTA "Salir en vivo" / "Mejorar" según status
- Lista de planes disponibles (GET /billing/plans — shape: `{id, name, monthly_price}`)
- Estado vacío elegante si hay CORS error
**Aceptación:** Plan FREE se muestra con CTA "Mejorar". Datos reales cuando API está disponible.

### T6 — /seguridad
**Qué:** `SeguridadPageComponent`
- Lista de sesiones (GET /me/sessions)
- Cada fila: ícono de dispositivo, user-agent parseado, IP, last_seen_at
- Chip "Esta sesión" en la sesión activa (is_active = true)
- Botón revocar por sesión (DELETE /me/sessions/{id})
- Botón "Cerrar las demás" (DELETE /me/sessions?except_current=true)
- Confirmación inline antes de revocar
**Aceptación:** Sesiones se listan, revocar actualiza la lista optimistamente.

### T7 — /equipo
**Qué:** `EquipoPageComponent`
- Lista de miembros (GET /admin/team/members) + roles (GET /admin/team/roles)
- Fila: avatar inicial, nombre/email, rol (Select inline), estado
- Invitar: formulario modal / inline (email + rol)
- POST /admin/team/members → añade a la lista
- PATCH /admin/team/members/{id} → cambia rol
- Si plan FREE (quotas.max_users <= 1): mostrar solo al owner + empty state
  con badge "Plan Gratis" y CTA "Mejora tu plan para añadir usuarios"
**Aceptación:** Lista muestra miembros reales. Invite flow funciona. FREE state visible.

### T8 — CSS global + tasks.md
**Qué:**
- `src/styles/hub-prime.css` con overrides de PrimeNG para contexto account
- Import en `styles.css`
- Marcar checkboxes 4.1–4.4 en `tasks.md`
**Aceptación:** Build limpio. 0 violaciones AXE. Screenshots de las 4 páginas.

---

## Criterios de done global
- [ ] `pnpm build` sin errores (warnings de budget OK)
- [ ] `ng serve --port 4250` → login con cuenta real → 4 rutas renderizan
- [ ] 0 violaciones AXE en cada página
- [ ] Design tokens correctos: `--faint: #73716a`, contraste ≥ 4.5:1
- [ ] Sin `::ng-deep` en componentes
- [ ] Sin `postcss.config.mjs` (solo `.postcssrc.json`)
- [ ] Commit: `feat: account & org hub (Fase 4)`
