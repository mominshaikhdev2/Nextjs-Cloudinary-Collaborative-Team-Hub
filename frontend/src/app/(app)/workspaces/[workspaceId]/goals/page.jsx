'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { goalApi } from '@/lib/api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useOptimistic } from '@/hooks/useOptimistic';
import GoalCard from '@/components/goals/GoalCard';
import GoalForm from '@/components/goals/GoalForm';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import PermissionGate from '@/components/ui/PermissionGate';
import { getSocket } from '@/lib/socket';

const STATUS_FILTERS = ['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED'];

export default function GoalsPage() {
  const { workspaceId } = useParams();
  const { currentRole } = useWorkspaceStore();

  const [goals, runOptimistic, isRunning, setGoals] = useOptimistic([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  // temp ID for optimistic new items
  const tempId = () => `temp_${Date.now()}`;

  useEffect(() => {
    fetchGoals();
    const socket = getSocket();
    if (socket) {
      socket.on('goal:created', (goal) =>
        setGoals((prev) => [goal, ...prev.filter((g) => !g.id.startsWith('temp_'))])
      );
      socket.on('goal:updated', (goal) =>
        setGoals((prev) => prev.map((g) => g.id === goal.id ? goal : g))
      );
      socket.on('goal:deleted', ({ id }) =>
        setGoals((prev) => prev.filter((g) => g.id !== id))
      );
    }
    return () => {
      const s = getSocket();
      s?.off('goal:created');
      s?.off('goal:updated');
      s?.off('goal:deleted');
    };
  }, [workspaceId]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data } = await goalApi.list(workspaceId);
      setGoals(data.goals);
    } finally {
      setLoading(false);
    }
  };

  // ── Optimistic create ─────────────────────────────────
  const handleCreate = async (goalData) => {
    const tid = tempId();
    const optimisticGoal = {
      id: tid,
      ...goalData,
      owner: { id: 'me', name: 'You', avatarUrl: null },
      milestones: [],
      _count: { actionItems: 0, progressUpdates: 0 },
      createdAt: new Date().toISOString(),
    };

    await runOptimistic({
      update: (prev) => [optimisticGoal, ...prev],
      request: () => goalApi.create(workspaceId, goalData),
      onSuccess: (result, prev) =>
        prev.map((g) => g.id === tid ? result.data.goal : g),
      successMsg: 'Goal created',
      errorMsg: 'Failed to create goal',
    });

    setShowForm(false);
  };

  // ── Optimistic update ────────────────────────────────
  const handleUpdate = async (goalId, goalData) => {
    await runOptimistic({
      update: (prev) =>
        prev.map((g) => g.id === goalId ? { ...g, ...goalData } : g),
      request: () => goalApi.update(workspaceId, goalId, goalData),
      onSuccess: (result, prev) =>
        prev.map((g) => g.id === goalId ? result.data.goal : g),
      successMsg: 'Goal updated',
      errorMsg: 'Failed to update goal',
    });
    setShowForm(false);
    setEditGoal(null);
  };

  // ── Optimistic delete ────────────────────────────────
  const handleDelete = async (goalId) => {
    await runOptimistic({
      update: (prev) => prev.filter((g) => g.id !== goalId),
      request: () => goalApi.delete(workspaceId, goalId),
      successMsg: 'Goal deleted',
      errorMsg: 'Failed to delete goal — restored',
    });
  };

  const filtered = filter === 'ALL' ? goals : goals.filter((g) => g.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-header">Goals</h1>
          <p className="th-text-3 text-sm mt-1">{goals.length} total goals</p>
        </div>
        <PermissionGate permission="createGoals" role={currentRole}>
          <button
            onClick={() => { setEditGoal(null); setShowForm(true); }}
            className="btn-primary"
            disabled={isRunning}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New goal
          </button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === s ? 'bg-violet-600 text-white' : 'th-surface th-text-2 hover:th-text-1'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            {s !== 'ALL' && (
              <span className="ml-1.5 text-[10px] opacity-70">
                {goals.filter((g) => g.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Optimistic pending indicator */}
      {isRunning && (
        <div className="flex items-center gap-2 text-xs th-text-3 animate-pulse">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Syncing…
        </div>
      )}

      {/* Goals Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 space-y-3 animate-pulse">
              <div className="h-4 w-1/2 th-surface-2 rounded" />
              <div className="h-3 w-3/4 th-surface-2 rounded" />
              <div className="h-2 th-surface-2 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="◎"
          title="No goals here"
          description={
            filter !== 'ALL'
              ? `No goals with status "${filter.replace(/_/g, ' ')}"`
              : 'Create your first goal to start tracking team progress'
          }
          action={
            <PermissionGate permission="createGoals" role={currentRole}>
              <button onClick={() => setShowForm(true)} className="btn-primary">
                Create goal
              </button>
            </PermissionGate>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              workspaceId={workspaceId}
              onEdit={(g) => { setEditGoal(g); setShowForm(true); }}
              onDelete={handleDelete}
              role={currentRole}
              isPending={goal.id.startsWith('temp_')}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditGoal(null); }}
        title={editGoal ? 'Edit goal' : 'New goal'}
        size="md"
      >
        <GoalForm
          workspaceId={workspaceId}
          initial={editGoal}
          onSuccess={(formData) => {
            if (editGoal) {
              handleUpdate(editGoal.id, formData);
            } else {
              handleCreate(formData);
            }
          }}
          onCancel={() => { setShowForm(false); setEditGoal(null); }}
          optimistic
        />
      </Modal>
    </div>
  );
}