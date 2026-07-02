# Changelog

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
