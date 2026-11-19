# Sitio público de ResiBreak (nginx). Se construye desde la raíz del repositorio:
#   docker build -f apps/web/Dockerfile -t resibreak-web .
#
# Sirve en un mismo dominio:
#   /       → web de administración y proveedor (apps/web, Vite)
#   /app/   → app de residentes y proveedores para el navegador (apps/mobile exportada a web);
#             es la que usan los iPhone, y se puede instalar como ícono en la pantalla de inicio
#   /api/   → la API (servicio "api" de docker-compose, red interna)
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 1. Web de administración (Vite). Misma dirección que el sitio: la API queda en /api.
FROM base AS web
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter web...
COPY apps/web apps/web
ENV VITE_API_URL=/api
RUN pnpm --filter web build

# 2. App móvil exportada a web, publicada bajo /app.
FROM base AS app
COPY apps/mobile/package.json apps/mobile/
RUN pnpm install --frozen-lockfile --filter mobile...
COPY apps/mobile apps/mobile
COPY apps/shared apps/shared
# Las variables del entorno pisan las de apps/mobile/.env (que además no se copia: ver .dockerignore).
ENV EXPO_PUBLIC_API_URL=/api EXPO_BASE_URL=/app CI=1
WORKDIR /repo/apps/mobile
RUN pnpm exec expo export --platform web --output-dir dist \
 && node web/preparar-web.mjs dist /app/

# 3. Imagen final: solo nginx y archivos estáticos.
FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web /repo/apps/web/dist /usr/share/nginx/html
COPY --from=app /repo/apps/mobile/dist /usr/share/nginx/app
EXPOSE 80
