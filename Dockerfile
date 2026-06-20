# syntax=docker/dockerfile:1
# Prod-like image: build the Angular SPA, serve dist/ with nginx.
# Build context = THIS repo. @proxima auth lib comes from GitHub Packages
# (@luisfarfan/auth) — the registry token is passed as a build secret, never baked.
#   docker build --secret id=node_auth_token,env=NODE_AUTH_TOKEN -t <img> .
# (the suite compose wires the secret for you)

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

# Manifests first (+ .npmrc with the @luisfarfan registry mapping) for layer cache.
COPY package.json .npmrc ./
COPY *lock* ./
RUN --mount=type=secret,id=node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" \
    sh -c 'if [ -f pnpm-lock.yaml ]; then pnpm install --no-frozen-lockfile; else npm install --legacy-peer-deps; fi'

COPY . .
RUN if [ -f pnpm-lock.yaml ]; then pnpm run build; else npm run build; fi \
 && cp -r dist/*/browser /dist-out

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /dist-out /usr/share/nginx/html
EXPOSE 80
