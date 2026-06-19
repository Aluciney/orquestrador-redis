import { db } from '../database/db.js';
import type { ToolRow } from '../database/types.js';

export interface ToolInput {
  name: string;
  description?: string | null;
}

export const toolRepository = {
  findAll(search?: string, limit?: number, offset?: number): ToolRow[] {
    const where = search ? 'WHERE name LIKE @like OR description LIKE @like' : '';
    const pag = limit !== undefined ? 'LIMIT @limit OFFSET @offset' : '';
    return db
      .prepare(
        `SELECT * FROM tools ${where} ORDER BY sort_order ASC, name ASC ${pag}`
      )
      .all({ like: `%${search ?? ''}%`, limit, offset }) as ToolRow[];
  },

  count(search?: string): number {
    const where = search ? 'WHERE name LIKE @like OR description LIKE @like' : '';
    const row = db
      .prepare(`SELECT COUNT(*) AS c FROM tools ${where}`)
      .get({ like: `%${search ?? ''}%` }) as { c: number };
    return row.c;
  },

  findById(id: number): ToolRow | undefined {
    return db.prepare('SELECT * FROM tools WHERE id = ?').get(id) as
      | ToolRow
      | undefined;
  },

  findByName(name: string): ToolRow | undefined {
    return db.prepare('SELECT * FROM tools WHERE name = ?').get(name) as
      | ToolRow
      | undefined;
  },

  create(input: ToolInput): ToolRow {
    // Nova ferramenta vai para o fim da ordem.
    const { next } = db
      .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM tools')
      .get() as { next: number };
    const info = db
      .prepare(
        'INSERT INTO tools (name, description, sort_order) VALUES (@name, @description, @sort)'
      )
      .run({ name: input.name, description: input.description ?? null, sort: next });
    return this.findById(Number(info.lastInsertRowid))!;
  },

  /** Reatribui `sort_order` conforme a ordem dos ids recebidos (1, 2, 3, ...). */
  reorder(orderedIds: number[]): void {
    const stmt = db.prepare('UPDATE tools SET sort_order = ? WHERE id = ?');
    const tx = db.transaction((ids: number[]) => {
      ids.forEach((id, index) => stmt.run(index + 1, id));
    });
    tx(orderedIds);
  },

  update(id: number, input: ToolInput): ToolRow | undefined {
    db.prepare('UPDATE tools SET name=@name, description=@description WHERE id=@id').run(
      { id, name: input.name, description: input.description ?? null }
    );
    return this.findById(id);
  },

  remove(id: number): boolean {
    return db.prepare('DELETE FROM tools WHERE id = ?').run(id).changes > 0;
  },
};
