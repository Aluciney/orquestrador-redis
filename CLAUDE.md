# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Plataforma para gerenciar filas **BullMQ** espalhadas por **múltiplos servidores Redis**, organizadas logicamente por **Ferramenta → Grupo → Fila** — a árvore lógica é independente de onde cada fila vive fisicamente. Monorepo `backend/` (Express + TS + ESM) + `frontend/` (React + Vite + Tailwind).

## Comandos

**Backend** (`cd backend`):
- `npm run dev` — dev com reload (`tsx watch`), porta 4000
- `npm run build` — `tsc` + copia os `.sql` para `dist/` (passo obrigatório, ver gotcha)
- `npm start` — roda `dist/index.js` (requer build)
- `npm run migrate` — roda migrations isoladamente

**Frontend** (`cd frontend`):
- `npm run dev` — Vite na porta 5173, faz proxy de `/api` e `/admin` para `http://localhost:4000`
- `npm run build` — `tsc -b && vite build`

**Docker** (raiz): `docker compose up -d --build` → app em `http://localhost:8010`.

Não há suíte de testes nem linter configurados.

## Arquitetura

Camadas do backend: `routes → middlewares → controllers → services → repositories → SQLite`. Os controllers são finos; regra de negócio fica nos services; SQL fica nos repositories.

**Dois planos que NÃO devem se confundir:**
- **Plano lógico** (SQLite): `tools → groups → queues`. `queues.group_id` é *nullable* (fila descoberta mas não classificada). `tools.sort_order` define a ordem de exibição (afeta a tela Ferramentas E o Dashboard, pois ambos usam `toolRepository.findAll()`, que ordena por `sort_order`).
- **Plano físico** (Redis): `queues.redis_server_id` aponta para onde a fila realmente está. A unicidade de `queue_name` só é garantida *dentro* de um mesmo Redis.

**Três singletons stateful resolvem o multi-Redis** (todos em `backend/src/services/`):
- `connectionManager` — cache de conexões `ioredis` por `redisServerId`. Ao editar/desabilitar/remover um Redis, o `redisServer.service` chama `invalidate(id)` para derrubar a conexão antiga.
- `queueRegistry` — cache de instâncias `Queue` do BullMQ por chave `serverId:queueName`, cada uma amarrada à conexão do seu servidor.
- `bullBoardService` — instância **única** de Bull Board cujas filas são trocadas por requisição (ver gotcha).

`discovery.service` (rota `POST /api/sync`) varre cada Redis habilitado com `SCAN bull:*:id` (nunca `KEYS`) e faz *upsert* das filas novas. `stats.service` agrega `getJobCounts()` por fila → grupo → ferramenta, com cache TTL (`STATS_CACHE_TTL_MS`); qualquer mutação de tool/group/queue/redis chama `statsService.invalidate()` nos controllers.

Frontend: `api/client.ts` (axios, baseURL `/api`, `withCredentials: true`) + `api/hooks.ts` (react-query, com invalidação cruzada de `dashboard`). Páginas em `src/pages/`, componentes compartilhados em `src/components/ui.tsx`. A reordenação de ferramentas (`ToolsPage`) usa **@dnd-kit** (drag pelo handle) com estado local otimista e persiste via `PUT /api/tools/reorder`.

## Autenticação e RBAC

Dois perfis: **admin** (controle total) e **usuário comum** (só Dashboard e Filas, e só as filas atribuídas).

- **Sessão**: JWT em **cookie httpOnly** (`SameSite=Lax`). `middlewares/auth.ts` expõe `requireAuth` (recarrega o user do banco a cada request — reflete `enabled`/admin na hora) e `requireAdmin`. `req.user` é um `SessionUser` (`{id, username, isAdmin}`).
- **Proteção de rotas** (`routes/index.ts`): `/api/health` e `/api/auth/{login,me,logout}` são públicos; o resto exige `requireAuth`. `redis`, `tools`, `groups`, `users`, `sync` e as **mutações** de `queues` exigem `requireAdmin`. O Bull Board (`/admin/queues`) também passa por `requireAuth` (`app.ts`).
- **Login**: `auth.service.login()` decide por `users.auth_type` — `local` valida bcrypt; `ad` chama `ldap.service` (bind com conta de serviço → busca sAMAccountName → re-bind como o DN do usuário). A config do AD vive no **banco** (tabela `ad_config`, linha única), gerenciada pela tela **Active Directory** (`/ad`, admin) com endpoints `GET/PUT /api/ad-config` e `POST /api/ad-config/test`. A URL carrega esquema+porta (`ldap://…:389` | `ldaps://…:636`); para LDAPS com CA interna há o flag `tls_reject_unauthorized`. NÃO há mais variáveis `AD_*` no ambiente.
- **Usuário inicial** `admin` (auth local, `is_admin=1`) é semeado em `index.ts` via `authService.ensureBootstrapAdmin()` com `ADMIN_INITIAL_PASSWORD`. Não pode ser removido/desabilitado; o último admin ativo também é protegido.
- **Escopo de visibilidade** (o ponto central): `access.service.allowedGroupIds(user)` → `'all'` para admin, ou união dos grupos diretos (`user_group_access`) com os grupos das ferramentas atribuídas (`user_tool_access`). Filas **não classificadas** (`group_id NULL`) só admin vê. Aplicado em: `queue.service` (filtro `groupIds`), `stats.service.dashboardForUser` (pós-filtra o cache global por usuário) e `bullBoard.service` (filtra adapters por `req.user`).
- Frontend: `auth/AuthContext.tsx` (bootstrap via `GET /api/auth/me`), `App.tsx` faz a guarda de rotas (sem sessão → `Login`; rotas admin só renderizam para admin), e as ações de admin são escondidas nas páginas via `useAuth()`.

## Gotchas (aprendidos na marra — não regredir)

- **Migrations `.sql` e o build:** `tsc` não copia `.sql`. O `npm run build` roda `scripts/copyMigrations.mjs` depois do `tsc`; o `migrate.ts` lê de `dist/database/migrations/` em runtime. Migrations novas são só arquivos `.sql` em `backend/src/database/migrations/` (aplicadas em ordem alfabética, registradas em `_migrations`).
- **`ioredis` fixado em `5.10.1`** (não use `^`): o `bullmq` depende da versão exata; divergência cria um `ioredis` aninhado e quebra os tipos do TypeScript ao passar a conexão para `new Queue`.
- **Import do adapter:** `from '@bull-board/api/bullMQAdapter'` (sem `.js`, usa o export map).
- **Filtro do Bull Board via cookie, não query/referer:** o iframe abre em `/admin/queues?queues=<id>`, mas o SPA do Bull Board faz XHRs internas que perdem o query param e o Referer. O `bullBoardService.middleware` grava o filtro num cookie `bb_queues` (escopado ao basePath) no load do HTML; resolução: query → cookie → referer. O board é uma instância global compartilhada → há corrida conhecida entre abas simultâneas (aceitável para uso single-admin).
- **Docker + inspeção SSL corporativa:** o `npm ci` dentro do container usa `NODE_TLS_REJECT_UNAUTHORIZED=0 npm_config_strict_ssl=false` inline (NÃO como ENV persistente — escopado à camada de install para não enfraquecer o TLS do app em runtime). Isso permite que `prebuild-install`/`node-gyp` baixem o binário nativo do `better-sqlite3`.
- **nginx + Compose:** o `frontend/nginx.conf` usa `resolver 127.0.0.11` com `proxy_pass` por variável para não crashar com "host not found in upstream" quando o backend ainda não subiu.
- **Ordem de rotas no Express:** rotas literais que colidiriam com `/:id` devem ser registradas ANTES (ex.: `PUT /tools/reorder` vem antes de `PUT /tools/:id` em `tools.routes.ts`, senão `reorder` seria capturado como um `id`).

## Convenções

- Backend é **ESM com `moduleResolution: NodeNext`**: imports relativos DEVEM terminar em `.js` (mesmo apontando para `.ts`).
- Validação de entrada com **zod** (`src/schemas/`) via middleware `validateBody`; erros lançam `AppError` (status HTTP) tratado centralmente em `errorHandler`.
- Senhas de Redis nunca voltam pela API — o `redisServer.service` faz `sanitize()` e expõe apenas `hasPassword`.
- Código e comentários em **português**.
