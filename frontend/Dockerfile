# ===== Build do bundle React =====
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
# Rede corporativa com inspeção SSL: o npm dentro do container não confia no proxy.
# NODE_TLS_REJECT_UNAUTHORIZED=0 cobre todo o TLS do Node. Escopo só nesta camada.
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm_config_strict_ssl=false npm ci

COPY . ./
RUN npm run build

# ===== Servir com Nginx (também faz proxy de /api e /admin p/ o backend) =====
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
