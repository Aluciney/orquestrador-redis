import { db } from '../database/db.js';
import type { GroupRow } from '../database/types.js';

export interface GroupInput {
  tool_id: number;
  name: string;
}

export const groupRepository = {
  findAll(toolId?: number): GroupRow[] {
    if (toolId !== undefined) {
      return db
        .prepare('SELECT * FROM groups WHERE tool_id = ? ORDER BY name')
        .all(toolId) as GroupRow[];
    }
    return db.prepare('SELECT * FROM groups ORDER BY name').all() as GroupRow[];
  },

  findById(id: number): GroupRow | undefined {
    return db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as
      | GroupRow
      | undefined;
  },

  create(input: GroupInput): GroupRow {
    const info = db
      .prepare('INSERT INTO groups (tool_id, name) VALUES (@tool_id, @name)')
      .run(input);
    return this.findById(Number(info.lastInsertRowid))!;
  },

  update(id: number, input: GroupInput): GroupRow | undefined {
    db.prepare('UPDATE groups SET tool_id=@tool_id, name=@name WHERE id=@id').run({
      id,
      ...input,
    });
    return this.findById(id);
  },

  remove(id: number): boolean {
    return db.prepare('DELETE FROM groups WHERE id = ?').run(id).changes > 0;
  },
};
