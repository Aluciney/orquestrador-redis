import { db } from '../database/db.js';
import type { RedisServerRow } from '../database/types.js';

export interface RedisServerInput {
  name: string;
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  tls: boolean;
  enabled: boolean;
}

export const redisServerRepository = {
  findAll(search?: string, limit?: number, offset?: number): RedisServerRow[] {
    const where = search ? 'WHERE name LIKE @like OR host LIKE @like' : '';
    const pag = limit !== undefined ? 'LIMIT @limit OFFSET @offset' : '';
    return db
      .prepare(
        `SELECT * FROM redis_servers ${where} ORDER BY name ASC ${pag}`
      )
      .all({ like: `%${search ?? ''}%`, limit, offset }) as RedisServerRow[];
  },

  count(search?: string): number {
    const where = search ? 'WHERE name LIKE @like OR host LIKE @like' : '';
    const row = db
      .prepare(`SELECT COUNT(*) AS c FROM redis_servers ${where}`)
      .get({ like: `%${search ?? ''}%` }) as { c: number };
    return row.c;
  },

  findById(id: number): RedisServerRow | undefined {
    return db
      .prepare('SELECT * FROM redis_servers WHERE id = ?')
      .get(id) as RedisServerRow | undefined;
  },

  findEnabled(): RedisServerRow[] {
    return db
      .prepare('SELECT * FROM redis_servers WHERE enabled = 1 ORDER BY name')
      .all() as RedisServerRow[];
  },

  create(input: RedisServerInput): RedisServerRow {
    const info = db
      .prepare(
        `INSERT INTO redis_servers (name, host, port, username, password, tls, enabled)
         VALUES (@name, @host, @port, @username, @password, @tls, @enabled)`
      )
      .run({
        name: input.name,
        host: input.host,
        port: input.port,
        username: input.username ?? null,
        password: input.password ?? null,
        tls: input.tls ? 1 : 0,
        enabled: input.enabled ? 1 : 0,
      });
    return this.findById(Number(info.lastInsertRowid))!;
  },

  update(id: number, input: RedisServerInput): RedisServerRow | undefined {
    db.prepare(
      `UPDATE redis_servers
       SET name=@name, host=@host, port=@port, username=@username,
           password=@password, tls=@tls, enabled=@enabled
       WHERE id=@id`
    ).run({
      id,
      name: input.name,
      host: input.host,
      port: input.port,
      username: input.username ?? null,
      password: input.password ?? null,
      tls: input.tls ? 1 : 0,
      enabled: input.enabled ? 1 : 0,
    });
    return this.findById(id);
  },

  setEnabled(id: number, enabled: boolean): RedisServerRow | undefined {
    db.prepare('UPDATE redis_servers SET enabled = ? WHERE id = ?').run(
      enabled ? 1 : 0,
      id
    );
    return this.findById(id);
  },

  remove(id: number): boolean {
    return db.prepare('DELETE FROM redis_servers WHERE id = ?').run(id).changes > 0;
  },
};
