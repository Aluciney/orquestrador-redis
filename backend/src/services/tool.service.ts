import { toolRepository, type ToolInput } from '../repositories/tool.repository.js';
import { groupRepository } from '../repositories/group.repository.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, paginate, type Paginated } from '../utils/pagination.js';
import type { ToolRow } from '../database/types.js';

export const toolService = {
  list(query: Record<string, unknown>): Paginated<ToolRow & { groupCount: number }> {
    const p = parsePagination(query);
    const rows = toolRepository.findAll(p.search, p.pageSize, p.offset);
    const total = toolRepository.count(p.search);
    const enriched = rows.map((t) => ({
      ...t,
      groupCount: groupRepository.findAll(t.id).length,
    }));
    return paginate(enriched, total, p);
  },

  listAll(): ToolRow[] {
    return toolRepository.findAll();
  },

  get(id: number): ToolRow {
    const row = toolRepository.findById(id);
    if (!row) throw AppError.notFound('Ferramenta');
    return row;
  },

  create(input: ToolInput): ToolRow {
    if (toolRepository.findByName(input.name)) {
      throw AppError.conflict('Já existe uma ferramenta com esse nome.');
    }
    return toolRepository.create(input);
  },

  update(id: number, input: ToolInput): ToolRow {
    if (!toolRepository.findById(id)) throw AppError.notFound('Ferramenta');
    const dup = toolRepository.findByName(input.name);
    if (dup && dup.id !== id) {
      throw AppError.conflict('Já existe uma ferramenta com esse nome.');
    }
    return toolRepository.update(id, input)!;
  },

  remove(id: number): void {
    if (!toolRepository.findById(id)) throw AppError.notFound('Ferramenta');
    toolRepository.remove(id); // cascade remove groups; filas viram não-classificadas
  },

  /** Define a ordem de exibição das ferramentas a partir da lista de ids. */
  reorder(ids: number[]): ToolRow[] {
    for (const id of ids) {
      if (!toolRepository.findById(id)) {
        throw AppError.badRequest(`Ferramenta ${id} inexistente.`);
      }
    }
    toolRepository.reorder(ids);
    return toolRepository.findAll();
  },
};
