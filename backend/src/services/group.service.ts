import { groupRepository, type GroupInput } from '../repositories/group.repository.js';
import { toolRepository } from '../repositories/tool.repository.js';
import { AppError } from '../utils/AppError.js';
import type { GroupRow } from '../database/types.js';

export const groupService = {
  list(toolId?: number): GroupRow[] {
    return groupRepository.findAll(toolId);
  },

  get(id: number): GroupRow {
    const row = groupRepository.findById(id);
    if (!row) throw AppError.notFound('Grupo');
    return row;
  },

  create(input: GroupInput): GroupRow {
    if (!toolRepository.findById(input.tool_id)) {
      throw AppError.badRequest('Ferramenta (tool_id) inexistente.');
    }
    try {
      return groupRepository.create(input);
    } catch (err) {
      if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw AppError.conflict('Já existe um grupo com esse nome nessa ferramenta.');
      }
      throw err;
    }
  },

  update(id: number, input: GroupInput): GroupRow {
    if (!groupRepository.findById(id)) throw AppError.notFound('Grupo');
    if (!toolRepository.findById(input.tool_id)) {
      throw AppError.badRequest('Ferramenta (tool_id) inexistente.');
    }
    return groupRepository.update(id, input)!;
  },

  remove(id: number): void {
    if (!groupRepository.findById(id)) throw AppError.notFound('Grupo');
    groupRepository.remove(id); // filas do grupo viram não-classificadas (SET NULL)
  },
};
