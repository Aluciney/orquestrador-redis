import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  Plus,
  Pencil,
  Trash2,
  FolderPlus,
  Check,
  X,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useToolsList,
  useToolMutations,
  useGroupsList,
  useGroupMutations,
} from '../api/hooks';
import { PageHeader, Modal, Spinner, EmptyState } from '../components/ui';
import type { Tool } from '../api/types';

function GroupManager({ toolId }: { toolId: number }) {
  const { data: groups, isLoading } = useGroupsList(toolId);
  const m = useGroupMutations();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const startEdit = (id: number, current: string) => {
    setEditingId(id);
    setEditName(current);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await m.update.mutateAsync({ id, body: { tool_id: toolId, name: trimmed } });
    cancelEdit();
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Novo grupo (ex.: Emails)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="btn-primary"
          disabled={!name.trim() || m.create.isPending}
          onClick={async () => {
            await m.create.mutateAsync({ tool_id: toolId, name: name.trim() });
            setName('');
          }}
        >
          <FolderPlus size={16} />
        </button>
      </div>
      <div className="space-y-1">
        {(groups ?? []).map((g) => (
          <div
            key={g.id}
            className="flex items-center justify-between gap-2 bg-surface rounded-lg px-3 py-2 text-sm"
          >
            {editingId === g.id ? (
              <>
                <input
                  className="input !py-1"
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveEdit(g.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <div className="flex shrink-0 gap-1">
                  <button
                    className="text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                    title="Salvar"
                    disabled={!editName.trim() || m.update.isPending}
                    onClick={() => void saveEdit(g.id)}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    className="text-slate-500 hover:text-slate-300"
                    title="Cancelar"
                    onClick={cancelEdit}
                  >
                    <X size={15} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-slate-200 truncate">{g.name}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="text-slate-500 hover:text-brand-hover"
                    title="Renomear grupo"
                    onClick={() => startEdit(g.id, g.name)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="text-slate-500 hover:text-red-400"
                    title="Remover grupo"
                    onClick={() => {
                      if (confirm(`Remover grupo "${g.name}"?`)) m.remove.mutate(g.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {(groups ?? []).length === 0 && (
          <p className="text-xs text-slate-500">Nenhum grupo ainda.</p>
        )}
      </div>
    </div>
  );
}

/** Card de ferramenta arrastável (dnd-kit sortable). */
function SortableToolCard({
  tool,
  dragDisabled,
  onEdit,
  onRemove,
  onManageGroups,
}: {
  tool: Tool;
  dragDisabled: boolean;
  onEdit: (t: Tool) => void;
  onRemove: (t: Tool) => void;
  onManageGroups: (t: Tool) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tool.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'card p-5',
        isDragging && 'relative z-10 opacity-80 ring-2 ring-brand shadow-xl'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {!dragDisabled && (
            <button
              {...attributes}
              {...listeners}
              className="-ml-1 mt-0.5 shrink-0 text-slate-500 hover:text-brand-hover cursor-grab active:cursor-grabbing touch-none"
              title="Arraste para reordenar"
              aria-label="Arrastar para reordenar"
            >
              <GripVertical size={18} />
            </button>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">{tool.name}</h3>
            {tool.description && (
              <p className="text-xs text-slate-500 mt-0.5">{tool.description}</p>
            )}
            <p className="text-xs text-slate-600 mt-1">
              {tool.groupCount ?? 0} grupo(s)
            </p>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button className="btn-ghost !p-2" onClick={() => onEdit(tool)}>
            <Pencil size={14} />
          </button>
          <button className="btn-danger !p-2" onClick={() => onRemove(tool)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <button
        className="btn-ghost w-full mt-3 justify-center"
        onClick={() => onManageGroups(tool)}
      >
        Gerenciar grupos
      </button>
    </div>
  );
}

export default function ToolsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useToolsList({ search, pageSize: 100 });
  const m = useToolMutations();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tool | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [groupsFor, setGroupsFor] = useState<Tool | null>(null);

  // Ordem local (otimista) sincronizada com o backend; permite reordenar via DnD
  // sem flicker enquanto a mutação persiste.
  const [items, setItems] = useState<Tool[]>([]);
  useEffect(() => {
    setItems(data?.data ?? []);
  }, [data]);

  // Reordenação só é confiável sobre a lista completa (sem filtro de busca).
  const canReorder = !search.trim();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next); // otimista
    m.reorder.mutate(next.map((t) => t.id));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setOpen(true);
  };
  const openEdit = (t: Tool) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description ?? '' });
    setOpen(true);
  };
  const save = async () => {
    const body = { name: form.name, description: form.description || null };
    if (editing) await m.update.mutateAsync({ id: editing.id, body });
    else await m.create.mutateAsync(body);
    setOpen(false);
  };

  const removeTool = (t: Tool) => {
    if (confirm(`Remover "${t.name}"? Os grupos serão apagados.`)) m.remove.mutate(t.id);
  };

  return (
    <div>
      <PageHeader
        title="Ferramentas"
        subtitle="Organize suas filas por sistema/ferramenta e grupos · arraste pelo ⠿ para reordenar"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nova ferramenta
          </button>
        }
      />

      <input
        className="input max-w-xs mb-4"
        placeholder="Buscar ferramenta..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="Nenhuma ferramenta cadastrada." />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((t) => t.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <SortableToolCard
                  key={t.id}
                  tool={t}
                  dragDisabled={!canReorder}
                  onEdit={openEdit}
                  onRemove={removeTool}
                  onManageGroups={setGroupsFor}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal
        open={open}
        title={editing ? 'Editar ferramenta' : 'Nova ferramenta'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={save} disabled={!form.name.trim()}>
              Salvar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ERP"
            />
          </div>
          <div>
            <label className="label">Descrição (opcional)</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!groupsFor}
        title={`Grupos · ${groupsFor?.name ?? ''}`}
        onClose={() => setGroupsFor(null)}
      >
        {groupsFor && <GroupManager toolId={groupsFor.id} />}
      </Modal>
    </div>
  );
}
