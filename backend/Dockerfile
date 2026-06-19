# ===== Build (compila TypeScript) =====
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
# Rede corporativa com inspeção SSL: npm, prebuild-install e node-gyp não confiam
# no proxy. NODE_TLS_REJECT_UNAUTHORIZED=0 cobre todo o TLS do Node (inclui o
# download do binário pré-compilado do better-sqlite3). Escopo só nesta camada.
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm_config_strict_ssl=false npm ci

COPY . ./
RUN npm run build

# ===== Runtime =====
FROM node:20 AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm_config_strict_ssl=false npm ci --omit=dev

COPY --from=build /app/dist ./dist
# tsc não copia .sql — migrations vão manualmente para dist
COPY --from=build /app/src/database/migrations ./dist/database/migrations

RUN mkdir -p /app/data
EXPOSE 4000
CMD ["node", "dist/index.js"]
