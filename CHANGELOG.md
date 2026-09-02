# Changelog

## [0.3.0](https://github.com/luisfarfan/proxima-hub/compare/proxima-hub-v0.2.0...proxima-hub-v0.3.0) (2026-09-02)


### Features

* **cuenta:** dos grupos con dueño en vez de cuatro pestañas planas ([194c71e](https://github.com/luisfarfan/proxima-hub/commit/194c71e2ccd9fba786358e4e8ef639b09573f4a6))
* **ecosystem:** onboard proxima-hub to Engineering System ([9ece7a0](https://github.com/luisfarfan/proxima-hub/commit/9ece7a056414acea6b3c6f90a030ae012f2963c0))
* **hub:** el centro pide sus números una sola vez, y Caja ya tiene qué decir ([228e24b](https://github.com/luisfarfan/proxima-hub/commit/228e24ba368a0200b45128a64d1d123bf7e949d6))
* **hub:** elegir comercio dice qué es cada uno, y su tienda se abre de un click ([6051acd](https://github.com/luisfarfan/proxima-hub/commit/6051acdfbc63c756c503e46c9c1437d507770d9a))
* **hub:** la marca aparece con el primer byte, no cuando termina la sesión ([ff9ec59](https://github.com/luisfarfan/proxima-hub/commit/ff9ec599950422d4cecd9fc37ca81c3e75c95634))
* **hub:** separar lo que es tuyo de lo que hay que comprar ([7322ae9](https://github.com/luisfarfan/proxima-hub/commit/7322ae9972afe39c2544c365e67ec3f3c4ff74ac))
* **identity:** una sola marca, y el login se pinta de amarillo pared ([e45b0e7](https://github.com/luisfarfan/proxima-hub/commit/e45b0e7db12be8511c5e74e3a00c8d75eba6f354))
* **plan:** /plan argumenta el cambio con el uso real ([f32cba4](https://github.com/luisfarfan/proxima-hub/commit/f32cba4990f10b20558bf2d16050795fc3850dab))
* **plan:** la escalera — el mapa completo, con tu peldaño marcado ([eb506ce](https://github.com/luisfarfan/proxima-hub/commit/eb506cef4aae81cb40f4e0d11231b322a06c2759))
* **registro:** el registro acompaña en vez de solo recoger ([e16bbcf](https://github.com/luisfarfan/proxima-hub/commit/e16bbcf4f0e1e97ea24ef4e39f3359be9895c997))


### Bug Fixes

* **auth:** el Hub restaura la sesión desde la cookie SSO (PPR-91) ([440681e](https://github.com/luisfarfan/proxima-hub/commit/440681e96210af54b8fa0c2a79683381a0f3cc61))
* **ci:** inline workflow — hub is public, cannot use private reusable ([90ec9cb](https://github.com/luisfarfan/proxima-hub/commit/90ec9cbc7c68db69a16362d0499cd1a77f297f6d))
* **equipo:** el rol real, la lista al día y el nombre del invitado (PPR-107, PPR-108, PPR-110) ([a9d0a91](https://github.com/luisfarfan/proxima-hub/commit/a9d0a9143141ea8e088cef96d20e95265a7b92d5))
* **hub:** al super admin deja de escondérsele el centro del hub (PPR-112) ([669fd6e](https://github.com/luisfarfan/proxima-hub/commit/669fd6eef0ae3a4bd68f93b45fa3a234c911b98c))
* **hub:** barrido responsive de las cinco pantallas de la cuenta ([b52a0de](https://github.com/luisfarfan/proxima-hub/commit/b52a0deb3dbb3a605e26b2ca6a24d603b5a889a2))
* **hub:** cerrar sesión cierra la sesión, no rebota a elegir-negocio ([9e2afbe](https://github.com/luisfarfan/proxima-hub/commit/9e2afbe397aa348401b66ba35396862781c546d9))
* **hub:** el centro se recorta por rol (PPR-112) ([1a96875](https://github.com/luisfarfan/proxima-hub/commit/1a9687509dc9e42c2eec2e20fc9db2dd27843ffb))
* **hub:** el error interno del backend deja de llegar al toast (PPR-106) ([20cd6e0](https://github.com/luisfarfan/proxima-hub/commit/20cd6e05890c1867aa7c2c63ce741e5ffa5d89b9))
* **hub:** el nombre del negocio sobrevive a la recarga (PPR-96) ([798bbed](https://github.com/luisfarfan/proxima-hub/commit/798bbedb8c8dcf0768fa1d51b38a4f388a15ac14))
* **hub:** el super admin entra a la plataforma, no elige "su" negocio (PPR-139) ([2f31ef3](https://github.com/luisfarfan/proxima-hub/commit/2f31ef3e735ee0736efde3617e7cd76ef8994c0a))
* **hub:** los números del centro dejan de empujar la tarjeta de Panel ([2d6436b](https://github.com/luisfarfan/proxima-hub/commit/2d6436b287b895e2c03ce35e6d9d91b9a4e5702d))
* **identity:** el acceso deja de prometer que Próxima es sólo para bodegas ([281ff5c](https://github.com/luisfarfan/proxima-hub/commit/281ff5c5672e9e955f86adeddce9b2643a6a896b))
* **identity:** objetivos táctiles en las pantallas de invitado ([1c8e781](https://github.com/luisfarfan/proxima-hub/commit/1c8e781232d507b36b173be8cf1e0828d3a4b0ab))
* **plan,cuenta:** la escalera estaba rota y el móvil sin revisar ([4d9b086](https://github.com/luisfarfan/proxima-hub/commit/4d9b086cd3d4e60eb9f4c00d9a107e986d224152))
* **plan:** "Tienda Web" abre el asistente en vez de cobrar sin diseño ([9d9a3f7](https://github.com/luisfarfan/proxima-hub/commit/9d9a3f7bc00f2ff892b34beff9a60d840cdf8489))
* **plan:** la pantalla se rompía con los nombres reales de los planes ([59c6ba5](https://github.com/luisfarfan/proxima-hub/commit/59c6ba5dbdeeaf40e99b7342cd829c971456f1c5))

## [0.2.0](https://github.com/luisfarfan/proxima-hub/compare/proxima-hub-v0.1.0...proxima-hub-v0.2.0) (2026-06-28)


### Features

* account & org hub (Fase 4) ([0587709](https://github.com/luisfarfan/proxima-hub/commit/05877090880e001c323903c7b52cd766fe6e6ef5))
* auth foundation (Fase 1) ([4e6d3b7](https://github.com/luisfarfan/proxima-hub/commit/4e6d3b7b8be9f1f3a3b1a63ab5a191b111962bf4))
* consume @proxima/auth library (Fase 5) ([2d5a033](https://github.com/luisfarfan/proxima-hub/commit/2d5a033ef74117cb8489437b83030a6b2c20c7ff))
* hub home launcher (Fase 3) ([af3f67e](https://github.com/luisfarfan/proxima-hub/commit/af3f67e628b0532ca7a7a42984bec3d24faa31c7))
* **hub:** add app version display in shell header ([92cc346](https://github.com/luisfarfan/proxima-hub/commit/92cc346d8407e383ff5e60e63b07772c3f0754e5))
* **hub:** add platform access button on elegir-negocio for super-admins ([28e0f30](https://github.com/luisfarfan/proxima-hub/commit/28e0f30c3d24870cea407c4d22d96afdcef10332))
* **hub:** add platform access button on elegir-negocio for super-admins ([906ac48](https://github.com/luisfarfan/proxima-hub/commit/906ac48dcdbef3a335fc256461f64b0454dd9c2f))
* **hub:** gate launcher apps by permission, not just entitlement ([01460e9](https://github.com/luisfarfan/proxima-hub/commit/01460e94429b610914c799667c70aaa9580c7687))
* identity pages (Fase 2) ([31d52e4](https://github.com/luisfarfan/proxima-hub/commit/31d52e436e95545ad667546308c03b57991cd5a9))
* **plan:** hub-billing-home — deep-link, downgrade, cancel, add-ons, payment history ([106bdc6](https://github.com/luisfarfan/proxima-hub/commit/106bdc68d16c71a7d3353c3ab3235277babea6fa))
* **plan:** wire MercadoPago upgrade checkout on /plan ([784b3f5](https://github.com/luisfarfan/proxima-hub/commit/784b3f5e832c757c8d26faafefc81a11c671aeb3))
* **registro:** real-time email uniqueness check and RUC lookup ([2f801c1](https://github.com/luisfarfan/proxima-hub/commit/2f801c1240a912d04313aa4d66fff049ddedcbfb))
* scaffold app shell (Fase 0) ([a72801c](https://github.com/luisfarfan/proxima-hub/commit/a72801ccdb0ff541e4bc1c6c026fe4536666dde9))


### Bug Fixes

* **a11y:** ARIA + form-error display audit — 0 AXE violations all screens ([9a986fe](https://github.com/luisfarfan/proxima-hub/commit/9a986fed8a978c64cedca54bf64293be7ff4feae))
* **a11y:** placeholder contrast on registro inputs ([dc6154e](https://github.com/luisfarfan/proxima-hub/commit/dc6154ef65cdcbfffe0120e212747725f3cbf7ba))
* **auth:** bump @luisfarfan/auth to 0.1.1 ([42fd9f1](https://github.com/luisfarfan/proxima-hub/commit/42fd9f16c15a968ffd8e6a18bef11fbd26eff705))
* **auth:** fix superadmin visibility and login auto-select in elegir-negocio ([4517841](https://github.com/luisfarfan/proxima-hub/commit/4517841d34e7ffb70953f0ff6c7a7efda2498c02))
* **auth:** use client-side navigation after login to preserve cookie-mode token ([575d278](https://github.com/luisfarfan/proxima-hub/commit/575d27812753616ae75c21abb07eb6a6aeaa8db7))
* **auth:** use client-side navigation after login to preserve cookie-mode token ([d3ab97a](https://github.com/luisfarfan/proxima-hub/commit/d3ab97a777c0c69e1fb309d9709c137f14a147c9))
* **billing:** close hub-billing-home gaps — routes, API endpoints, admin funnel ([0ef6205](https://github.com/luisfarfan/proxima-hub/commit/0ef62053a030e12a2942bb9ddd4e0ea7f09af4ef))
* **ci:** regenerate lockfile without local pnpm-workspace.yaml override ([55cebd6](https://github.com/luisfarfan/proxima-hub/commit/55cebd651e4687d7c3688067bafe3c3732d9f9e7))
* complete Hub delegation return-trip + business propagation (Fase 6 r2) ([396ea83](https://github.com/luisfarfan/proxima-hub/commit/396ea839c5e40372304398376c4fad45fc75c7d2))
* Fase 4 polish (roles, invite gating, quota meters) ([cd3974b](https://github.com/luisfarfan/proxima-hub/commit/cd3974b283a06108a8e73af9793d9a9bdb410825))
* **hub:** add SSO handoff when opening cross-app links from hub home ([ea0f1e8](https://github.com/luisfarfan/proxima-hub/commit/ea0f1e85bec968296e416ce58d38c610a206db0f))
* **hub:** fail-open the permission gate when /me omits permissions ([c64e853](https://github.com/luisfarfan/proxima-hub/commit/c64e8531c50417a61708e9f98438a72294657aee))


### Performance Improvements

* **hub:** cache billing/status resources with 5-min TTL in HubDataCacheService ([b6dcd84](https://github.com/luisfarfan/proxima-hub/commit/b6dcd84e3f5fc5f70c4991a2305bf5ae08a6b77d))
