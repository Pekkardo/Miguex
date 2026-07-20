# ── Etapa 1: build de la app Angular ─────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY frontend-angular/package*.json ./
RUN npm ci

COPY frontend-angular/ ./
RUN npm run build

# ── Etapa 2: nginx sirve el build + proxy al backend ─────────────────
FROM nginx:1.27-alpine

# Configuración del sitio (frontend + proxy al backend)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Salida del build de Angular. Todos los tableros (0800, WAD, Egg y Cruce) son
# rutas de la SPA: ya no se copian HTML sueltos.
COPY --from=build /app/dist/tablero/browser/ /usr/share/nginx/html/

EXPOSE 86
