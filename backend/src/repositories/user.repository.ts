import { db } from '../database/db.js';
import type { AuthType, UserRow } from '../database/types.js';

export interface UserAccess {
  toolIds: number[];
  groupIds: number[];
}

export const userRepository = {
  findAll(search?: string, limit?: number, offset?: number): UserRow[] {
    const where = search ? 'WHERE username LIKE @like' : '';
    const pag = limit !== undefined ? 'LIMIT @limit OFFSET @offset' : '';
    return db
      .prepare(
        `SELECT * FROM users ${where} ORDER BY username ASC ${pag}`
      )
      .all({ like: `%${search ?? ''}%`, limit, offset }) as UserRow[];
  },

  count(search?: string): number {
    const where = search ? 'WHERE username LIKE @like' : '';
    const row = db
      .prepare(`SELECT COUNT(*) AS c FROM users ${where}`)
      .get({ like: `%${search ?? ''}%` }) as { c: number };
    return row.c;
  },

  findById(id: number): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
      | UserRow
      | undefined;
  },

  findByUsername(username: string): UserRow | undefined {
    return db
      .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
      .get(username) as UserRow | undefined;
  },

  countAdmins(): number {
    const row = db
      .prepare('SELECT COUNT(*) AS c FROM users WHERE is_admin = 1 AND enabled = 1')
      .get() as { c: number };
    return row.c;
  },

  create(input: {
    username: string;
    auth_type: AuthType;
    password_hash?: string | null;
    is_admin: boolean;
    enabled?: boolean;
  }): UserRow {
    const info = db
      .prepare(
        `INSERT INTO users (username, auth_type, password_hash, is_admin, enabled)
         VALUES (@username, @auth_type, @password_hash, @is_admin, @enabled)`
      )
      .run({
        username: input.username,
        auth_type: input.auth_type,
        password_hash: input.password_hash ?? null,
        is_admin: input.is_admin ? 1 : 0,
        enabled: input.enabled === false ? 0 : 1,
      });
    return this.findById(Number(info.lastInsertRowid))!;
  },

  update(
    id: number,
    fields: { is_admin?: boolean; enabled?: boolean }
  ): UserRow | undefined {
    const sets: string[] = [];
    const params: Record<string, unknown> = { id };
    if (fields.is_admin !== undefined) {
      sets.push('is_admin = @is_admin');
      params.is_admin = fields.is_admin ? 1 : 0;
    }
    if (fields.enabled !== undefined) {
      sets.push('enabled = @enabled');
      params.enabled = fields.enabled ? 1 : 0;
    }
    if (sets.length > 0) {
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run(params);
    }
    return this.findById(id);
  },

  setPasswordHash(id: number, hash: string): void {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  },

  remove(id: number): boolean {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
  },

  /* --------------------------- Acessos --------------------------- */

  getAccess(userId: number): UserAccess {
    const tools = db
      .prepare('SELECT tool_id FROM user_tool_access WHERE user_id = ?')
      .all(userId) as { tool_id: number }[];
    const groups = db
      .prepare('SELECT group_id FROM user_group_access WHERE user_id = ?')
      .all(userId) as { group_id: number }[];
    return {
      toolIds: tools.map((t) => t.tool_id),
      groupIds: groups.map((g) => g.group_id),
    };
  },

  /** Substitui (transacional) o conjunto de ferramentas e grupos do usuário. */
  setAccess(userId: number, access: UserAccess): void {
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM user_tool_access WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_group_access WHERE user_id = ?').run(userId);
      const insTool = db.prepare(
        'INSERT OR IGNORE INTO user_tool_access (user_id, tool_id) VALUES (?, ?)'
      );
      const insGroup = db.prepare(
        'INSERT OR IGNORE INTO user_group_access (user_id, group_id) VALUES (?, ?)'
      );
      for (const tid of access.toolIds) insTool.run(userId, tid);
      for (const gid of access.groupIds) insGroup.run(userId, gid);
    });
    tx();
  },

  /**
   * Conjunto de group_ids que o usuário pode ver: grupos atribuídos diretamente
   * UNIÃO grupos pertencentes às ferramentas atribuídas.
   */
  allowedGroupIds(userId: number): number[] {
    const rows = db
      .prepare(
        `SELECT g.id AS id FROM groups g
         JOIN user_tool_access uta ON uta.tool_id = g.tool_id AND uta.user_id = @uid
         UNION
         SELECT uga.group_id AS id FROM user_group_access uga WHERE uga.user_id = @uid`
      )
      .all({ uid: userId }) as { id: number }[];
    return rows.map((r) => r.id);
  },
};
