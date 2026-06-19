# Orquestrador de Filas — BullMQ multi-Redis

Plataforma para gerenciar filas **BullMQ** espalhadas por **múltiplos servidores Redis**,
organizadas logicamente por **Ferramenta → Grupo → Fila**, com dashboard agregado e
Bull Board embutido.

```
ERP                         Downloader                 CRM
└─ Emails                   └─ Downloads               └─ Integrações
   ├─ email-send  (Redis A)    ├─ download-images (B)     ├─ hubspot-sync   (C)
   └─ email-retry (Redis A)    └─ download-videos (B)     └─ salesforce-sync (A)
```

A árvore lógica é independente de onde cada fila vive fisicamente.

---

## Arquitetura

```
Frontend (React/Vite/Tailwind)
        │  /api  +  /admin (iframe Bull Board)
        ▼
Backend (Express/TS/ESM)
  routes → middlewares → controllers → services → repositories → SQLite
                              │
                              ├─ ConnectionManager  (cache ioredis por servidor)
                              ├─ QueueRegistry       (cache Queue BullMQ por servidor:fila)
                              ├─ DiscoveryService    (SCAN bull:*:id)
                              ├─ StatsService        (getJobCounts agregado + cache TTL)
                              └─ BullBoardService    (board dinâmico por requisição)
```

**Modelo de dados (SQLite):**
`redis_servers (1:N) queues (N:1) groups (N:1) tools`. `queues.group_id` é *nullable*
(fila descoberta mas não classificada).

**Por que estas escolhas:** `better-sqlite3` (síncrono, migrations simples), `SCAN`
em vez de `KEYS` (seguro em produção), Bull Board filtrado por iframe (`?queues=<id>`)
para evitar colisão de nomes de fila entre Redis diferentes, `zod` (validação) e
`pino` (logs estruturados).

---

## Estrutura

```
backend/
  src/
    config/        env, logger
    database/      db, migrate, migrations/*.sql, types
    repositories/  acesso ao SQLite (redis, tool, group, queue)
    services/      regras + conexões Redis + descoberta + stats + bull board
    controllers/   handlers HTTP
    routes/        definição das rotas
    middlewares/   validate (zod), errorHandler, asyncHandler
    schemas/       schemas zod
    utils/         AppError, pagination
frontend/
  src/
    api/           client axios, hooks react-query, types
    components/     Layout, Sidebar, ui (modal, badges...)
    pages/          Dashboard, Tools, Redis, Queues, QueueBoard, Settings
```

---

## Rodando em desenvolvimento

**Backend** (porta 4000):
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

**Frontend** (porta 5173, faz proxy de `/api` e `/admin` para o backend):
```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5173.

---

## Rodando com Docker

O `docker-compose.yml` sobe **backend** + **frontend** (nginx). O frontend é exposto
na porta **8010** e faz proxy de `/api` e `/admin` para o backend. O SQLite é
persistido no volume `sqlite-data`.

```bash
docker compose up -d --build
```

Acesse http://localhost:8010.

---

## Fluxo de uso

1. **Redis** → cadastre seus servidores (botão *Testar* valida a conexão).
2. **Sincronizar** (topo) → descobre filas (`bull:*:id`) e registra as novas.
3. **Ferramentas** → crie ferramentas e seus grupos (ex.: ERP → Emails).
4. **Filas** → classifique cada fila em uma Ferramenta/Grupo, habilite/desabilite.
5. **Dashboard** → contagens agregadas (waiting/active/delayed/failed/...) por
   fila, grupo e ferramenta.
6. **Clique numa fila** → abre o Bull Board daquela fila embutido na interface.

---

## API REST

| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/api/redis` | lista servidores (paginado, `?search=`) |
| POST   | `/api/redis` | cria servidor |
| PUT    | `/api/redis/:id` | edita servidor |
| PATCH  | `/api/redis/:id/enabled` | habilita/desabilita |
| POST   | `/api/redis/:id/test` | testa conexão salva |
| POST   | `/api/redis/test` | testa conexão avulsa |
| DELETE | `/api/redis/:id` | remove |
| GET/POST | `/api/tools` | lista/cria ferramentas |
| PUT/DELETE | `/api/tools/:id` | edita/remove |
| GET/POST | `/api/groups` | lista (`?toolId=`)/cria grupos |
| PUT/DELETE | `/api/groups/:id` | edita/remove |
| GET | `/api/queues` | lista filas (filtros: `search`, `toolId`, `redisServerId`, `groupId`, `unclassified`, `enabled`; paginado) |
| GET | `/api/queues/:id` | detalhe |
| GET | `/api/queues/:id/stats` | contagem de jobs |
| PUT | `/api/queues/:id` | classifica (`group_id`) / habilita (`enabled`) |
| DELETE | `/api/queues/:id` | remove do catálogo |
| POST | `/api/sync` | descobre filas (`{ redisServerId? }`) |
| GET | `/api/stats/dashboard` | estatísticas agregadas (`?force=true`) |
| GET | `/api/health` | healthcheck |
| —   | `/admin/queues?queues=<id,...>` | Bull Board (filtrado) |

---

## Notas

- Senhas de Redis nunca são devolvidas pela API (apenas `hasPassword`).
