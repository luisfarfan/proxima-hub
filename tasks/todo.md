# Todo — Fase 4: Cuenta / Organización

## T1 — HubShell refactor
- [x] Crear `src/app/features/hub/shell/hub-shell.component.ts` (top bar + router-outlet)
- [x] Crear `src/app/features/hub/shell/hub-shell.component.css`
- [x] Mover signals/métodos del top bar a HubShellComponent
- [x] Simplificar HomeComponent (solo .hub-main y su data)
- [x] Restructurar `app.routes.ts` (parent layout + children)
- [ ] Verificar: `ng serve` → home idéntico visualmente

## T2 — AccountShell + nav tabs
- [x] Crear `src/app/features/hub/account/account-shell.component.ts`
- [x] Nav: Cuenta / Plan / Seguridad / Equipo con routerLinkActive
- [x] Registrar rutas lazy en app.routes.ts bajo el parent
- [ ] Verificar: navegación entre tabs funciona

## T3 — QuotaLabelPipe
- [x] Crear `src/app/shared/pipes/quota-label.pipe.ts`
- [x] Actualizar `home.component.html` para usar el pipe en card de plan

## T4 — /cuenta
- [x] Añadir `changePassword()` a `src/app/core/auth/auth.service.ts`
- [x] Crear `src/app/features/hub/account/cuenta-page.component.ts`
- [x] Avatar + info de usuario (read-only, datos del AuthService.user())
- [x] Formulario cambio de contraseña (validación local + POST /auth/change-password)
- [x] Reuse GoogleLinkSectionComponent
- [ ] Verificar: form valida y llama endpoint

## T5 — /plan
- [x] Crear `src/app/features/hub/account/plan-page.component.ts`
- [x] GET /admin/billing/subscription/status — barras de uso + QuotaLabelPipe
- [x] GET /billing/plans — lista de planes disponibles
- [x] CTA "Mejorar" / "Salir en vivo"
- [x] Empty state para CORS gap
- [ ] Verificar: datos y fallback

## T6 — /seguridad
- [x] Crear `src/app/features/hub/account/seguridad-page.component.ts`
- [x] GET /me/sessions — lista de sesiones
- [x] Chip "Esta sesión" en la activa
- [x] DELETE /me/sessions/{id} — revocar una
- [x] DELETE /me/sessions?except_current=true — revocar todas las demás
- [x] Confirmación inline antes de revocar
- [ ] Verificar: sesiones listan, revocar actualiza optimistamente

## T7 — /equipo
- [x] Crear `src/app/features/hub/account/equipo-page.component.ts`
- [x] GET /admin/team/members + GET /admin/team/roles
- [x] Fila por miembro: avatar, nombre/email, rol Select, estado
- [x] PATCH /admin/team/members/{id} — cambiar rol inline
- [x] Formulario invitar (email + rol) → POST /admin/team/members
- [x] Estado FREE (max_users ≤ 1): solo owner + CTA upgrade
- [ ] Verificar: lista, invite flow, FREE state

## T8 — CSS + tasks.md + build final
- [x] Crear `src/styles/hub-prime.css` con overrides de PrimeNG para account
- [x] Importar en `styles.css`
- [ ] Marcar checkboxes 4.1–4.4 en `openspec/changes/platform-app-shell/tasks.md`
- [ ] `pnpm build` sin errores
- [ ] Screenshots de /cuenta, /plan, /seguridad, /equipo
- [ ] 0 violaciones AXE en cada página
- [ ] Commit: `feat: account & org hub (Fase 4)`
