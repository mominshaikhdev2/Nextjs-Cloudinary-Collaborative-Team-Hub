'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { actionItemApi } from '@/lib/api1';
import { useOptimistic } from '@/hooks/useOptimistic';
import KanbanBoard from '@/components/actionItems/KanbanBoard';
import ListView from '@/components/actionItems/ListView';
import ActionItemForm from '@/components/actionItems/ActionItemForm';
import Modal from '@/components/ui/Modal';
import PermissionGate from '@/components/ui/PermissionGate';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

const EMPTY_COLS = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
const tempId = () => `temp_${Date.now()}`;

export default function ActionItemsPage() {
  const { workspaceId } = useParams();
  const { currentRole } = useWorkspaceStore();

  const [columns, setColumns] = useState(EMPTY_COLS);
  const [view, setView] = useState('kanban');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [pendingIds, setPendingIds] = useState(new Set());

  useEffect(() => {
    fetchItems();
    const socket = getSocket();
    if (socket) {
      socket.on('actionItem:created', (item) =>
        setColumns((prev) => {
          const next = { ...prev };
          // Remove any temp item with same title (race condition guard)
          Object.keys(next).forEach((col) => {
            next[col] = next[col].filter((i) => !i.id.startsWith('temp_'));
          });
          next[item.status] = [item, ...next[item.status]];
          return next;
        })
      );
      socket.on('actionItem:updated', (item) =>
        setColumns((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((col) => { next[col] = next[col].filter((i) => i.id !== item.id); });
          next[item.status] = [item, ...next[item.status]];
          return next;
        })
      );
      socket.on('actionItem:deleted', ({ id }) =>
        setColumns((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((col) => { next[col] = next[col].filter((i) => i.id !== id); });
          return next;
        })
      );
    }
    return () => {
      const s = getSocket();
      s?.off('actionItem:created');
      s?.off('actionItem:updated');
      s?.off('actionItem:deleted');
    };
  }, [workspaceId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await actionItemApi.list(workspaceId, { view: 'kanban' });
      setColumns(data.columns);
    } finally {
      setLoading(false);
    }
  };

  // ── Optimistic create ─────────────────────────────────
  const handleCreate = async (formData) => {
    const tid = tempId();
    const optimistic = {
      id: tid,
      ...formData,
      assignee: null,
      goal: null,
      createdAt: new Date().toISOString(),
    };
    const status = formData.status || 'TODO';
    const snapshot = { ...columns };

    // Instant add
    setColumns((prev) => ({
      ...prev,
      [status]: [optimistic, ...prev[status]],
    }));
    setPendingIds((s) => new Set(s).add(tid));

    try {
      const { data } = await actionItemApi.create(workspaceId, formData);
      setColumns((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((col) => { next[col] = next[col].filter((i) => i.id !== tid); });
        next[data.item.status] = [data.item, ...next[data.item.status]];
        return next;
      });
      toast.success('Task created');
    } catch (err) {
      setColumns(snapshot);
      toast.error(err?.response?.data?.error || 'Failed to create task');
    } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(tid); return n; });
    }

    setShowForm(false);
    setEditItem(null);
  };

  // ── Optimistic update ─────────────────────────────────
  const handleUpdate = async (id, formData) => {
    const snapshot = { ...columns };
    setColumns((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((col) => { next[col] = next[col].filter((i) => i.id !== id); });
      const updated = { ...formData, id };
      next[formData.status] = [updated, ...next[formData.status]];
      return next;
    });

    try {
      const { data } = await actionItemApi.update(workspaceId, id, formData);
      setColumns((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((col) => { next[col] = next[col].filter((i) => i.id !== id); });
        next[data.item.status] = [data.item, ...next[data.item.status]];
        return next;
      });
      toast.success('Task updated');
    } catch (err) {
      setColumns(snapshot);
      toast.error(err?.response?.data?.error || 'Failed to update task');
    }

    setShowForm(false);
    setEditItem(null);
  };

  // ── Optimistic delete ─────────────────────────────────
  const handleDelete = async (id) => {
    const snapshot = { ...columns };
    setColumns((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((col) => { next[col] = next[col].filter((i) => i.id !== id); });
      return next;
    });

    try {
      await actionItemApi.delete(workspaceId, id);
      toast.success('Task deleted');
    } catch (err) {
      setColumns(snapshot);
      toast.error('Failed to delete — restored');
    }
  };

  // ── Optimistic status change (kanban drag / list select) ──
  const handleStatusChange = async (id, newStatus, item) => {
    const snapshot = { ...columns };
    setColumns((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((col) => { next[col] = next[col].filter((i) => i.id !== id); });
      next[newStatus] = [...next[newStatus], { ...item, status: newStatus }];
      return next;
    });

    try {
      await actionItemApi.update(workspaceId, id, { status: newStatus });
    } catch {
      setColumns(snapshot);
      toast.error('Failed to move task — restored');
    }
  };

  const totalCount = Object.values(columns).flat().length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Action Items</h1>
          <p className="th-text-3 text-sm mt-1">{totalCount} tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex th-surface rounded-lg p-0.5 border th-border">
            {['kanban', 'list'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                  view === v ? 'th-surface-2 th-text-1' : 'th-text-3 hover:th-text-2'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <PermissionGate permission="createActionItems" role={currentRole}>
            <button onClick={() => { setEditItem(null); setShowForm(true); }} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New task
            </button>
          </PermissionGate>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 space-y-3 animate-pulse min-h-[200px]">
              <div className="h-3 w-1/2 th-surface-2 rounded" />
              {[1, 2].map((j) => <div key={j} className="h-20 th-surface-2 rounded-lg" />)}
            </div>
          ))}
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard
          columns={columns}
          setColumns={setColumns}
          workspaceId={workspaceId}
          pendingIds={pendingIds}
          onEdit={(item) => { setEditItem(item); setShowForm(true); }}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <ListView
          columns={columns}
          workspaceId={workspaceId}
          onEdit={(item) => { setEditItem(item); setShowForm(true); }}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        title={editItem ? 'Edit task' : 'New task'}
      >
        <ActionItemForm
          workspaceId={workspaceId}
          initial={editItem}
          onSuccess={(formData) => editItem ? handleUpdate(editItem.id, formData) : handleCreate(formData)}
          onCancel={() => { setShowForm(false); setEditItem(null); }}
        />
      </Modal>
    </div>
  );
}