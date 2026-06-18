# syntax=docker/dockerfile:1
# Prod-like image: build the Angular SPA, serve the static dist/ with nginx.
#
# IMPORTANT: build context MUST be the workspace root (proxima/), not this repo,
# because admin/hub/pos consume the local @proxima/auth package by path. The
# suite compose (proxima-infra/docker-compose.suite.yml) sets context: .. for you.
# Standalone:  docker build -f proxima-hub/Dockerfile -t proxima-hub ..
ARG APP_DIR=proxima-hub

# ---- build stage ----------------------------------------------------------
FROM node:22-alpine AS build
ARG APP_DIR
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

# Vendor the prebuilt local @proxima/auth package at a stable container path.
COPY proxima-auth/dist /vendor/proxima-auth/dist

# Manifests first → Docker layer cache for the (heavy) dependency install.
COPY ${APP_DIR}/package.json ./package.json
COPY ${APP_DIR}/*lock* ./
# Repoint the host-absolute "file:/Users/.../proxima-auth/dist" → vendored copy.
RUN sed -i 's#file:/[^"]*proxima-auth/dist#file:/vendor/proxima-auth/dist#g' package.json
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --no-frozen-lockfile; else npm install --legacy-peer-deps; fi

# App sources + production build. dist/<project>/browser → /dist-out.
COPY ${APP_DIR}/ ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm run build; else npm run build; fi \
 && cp -r dist/*/browser /dist-out

# ---- runtime stage --------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
ARG APP_DIR
COPY ${APP_DIR}/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /dist-out /usr/share/nginx/html
EXPOSE 80
