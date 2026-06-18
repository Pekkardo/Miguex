FROM nginx:1.27-alpine

# Configuración del sitio (frontend + proxy al backend)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Frontend estático
COPY frontend/ /usr/share/nginx/html/

EXPOSE 86
