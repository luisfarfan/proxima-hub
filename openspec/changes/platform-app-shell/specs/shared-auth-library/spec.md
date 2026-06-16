## ADDED Requirements

### Requirement: Librería `@proxima/auth` compartida
La lógica de autenticación (servicios, guards, interceptors, token-storage, business-context, runtime-config, tipos) SHALL extraerse a una Angular library `@proxima/auth`, distribuida por **GitHub Packages** (`npm.pkg.github.com`). La lib MUST contener solo lógica, **no** componentes de UI de login. `proxima-hub`, `proxima-admin` y `proxima-pos` MUST consumirla en vez de duplicar el código.

#### Scenario: Las apps consumen la lib
- **WHEN** se revisa el `package.json` de hub/admin/pos tras la adopción
- **THEN** declaran la dependencia `@proxima/auth` desde GitHub Packages
- **THEN** no mantienen copias divergentes del `auth.service`/interceptors

### Requirement: Versionado y consumo sin npm pagado
La lib SHALL versionarse con semver y publicarse a GitHub Packages (gratis). Cada app consumidora MUST configurar `.npmrc` con el registro `@proxima` y un token de GitHub; NO MUST requerir una cuenta npm privada de pago.

#### Scenario: Instalación con GitHub Packages
- **WHEN** una app corre `pnpm install` con el `.npmrc` configurado
- **THEN** resuelve `@proxima/auth` desde `npm.pkg.github.com` con el token
