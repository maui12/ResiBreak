# Imagen de la API. Se construye desde la raíz del repositorio (monorepo pnpm):
#   docker build -f apps/api/Dockerfile -t resibreak-api .
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

# 1. Dependencias y compilación
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter api...
COPY apps/api apps/api
RUN pnpm --filter api build

# 2. Solo dependencias de producción
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod --filter api...

# 3. Imagen final: sin código fuente, sin dependencias de desarrollo, usuario sin privilegios.
#    Se conserva la estructura /repo/apps/api porque pnpm enlaza node_modules con rutas relativas.
FROM node:22-alpine
ENV NODE_ENV=production TZ=America/Santiago
RUN apk add --no-cache tzdata
WORKDIR /repo/apps/api
COPY --from=deps /repo/node_modules /repo/node_modules
COPY --from=deps /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY apps/api/package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
