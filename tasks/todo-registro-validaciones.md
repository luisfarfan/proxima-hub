# Todo — Validaciones en tiempo real: Registro

## SLICE 1 — Email check

### API (proxima-api)
- [ ] Añadir `EmailAvailabilityResponse` schema en `src/modules/identity/api/schemas.py`
- [ ] Implementar `GET /auth/check-email` en `src/modules/identity/api/router.py`
  - Rate limit 20/min, sin auth, usa `is_disposable_email` + `user_repo.get_by_email`

### Frontend (proxima-hub)
- [ ] Añadir `checkEmail()` en `registro-api.service.ts`
- [ ] Añadir `emailStatus` signal + debounce en `registro-page.component.ts`
- [ ] Bloquear `canContinue` (step 2) si `taken` o `disposable`
- [ ] Añadir UI de estado en HTML (spinner / check / error inline)
- [ ] Añadir CSS necesario

### Verificación slice 1
- [ ] `curl .../auth/check-email?email=existente` → `{ available: false, reason: "EMAIL_TAKEN" }`
- [ ] `curl .../auth/check-email?email=mailinator.com` → `{ available: false, reason: "DISPOSABLE_EMAIL" }`
- [ ] En navegador: email existente → error inline a los 700ms, "Continuar" bloqueado

---

## SLICE 2 — RUC lookup

### API (proxima-api)
- [ ] Añadir `RucLookupResponse` schema en `src/modules/identity/api/schemas.py`
- [ ] Implementar `GET /auth/lookup-ruc` en `src/modules/identity/api/router.py`
  - Rate limit 5/min, sin auth, usa `ApisunatClient` con `APISUNAT_PLATFORM_TOKEN`
  - 503 si token no configurado, 404 si RUC no existe

### Frontend (proxima-hub)
- [ ] Añadir `lookupRuc()` en `registro-api.service.ts`
- [ ] Añadir `rucLookup` signal + `canVerifyRuc` computed + `verifyRuc()` en componente
- [ ] Reset `rucLookup` cuando el campo ruc cambia
- [ ] Añadir botón "Verificar RUC" + resultado / error en HTML (step 1)
- [ ] Añadir CSS necesario

### Verificación slice 2
- [ ] `curl .../auth/lookup-ruc?ruc=20100070970` → razón social de Telefónica
- [ ] `curl .../auth/lookup-ruc?ruc=11111111111` → 404 RUC_NOT_FOUND
- [ ] En navegador: RUC válido → botón habilitado → click → razón social visible

---

## Regresión
- [ ] Submit completo del formulario sigue funcionando en prod
- [ ] 0 errores TS (`pnpm build`)
