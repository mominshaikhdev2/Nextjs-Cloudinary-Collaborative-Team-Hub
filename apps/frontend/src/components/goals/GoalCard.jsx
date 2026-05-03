'use client';
import Link from 'next/link';
import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { format, isPast } from 'date-fns';

export default function GoalCard({ goal, workspaceId, onEdit, onDelete, role }) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const avgProgress = goal.milestones?.length
    ? Math.round(goal.milestones.reduce((a, m) => a + m.progress, 0) / goal.milestones.length)
    : 0;

  const isOverdue = goal.dueDate && isPast(new Date(goal.dueDate)) && goal.status !== 'COMPLETED';

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(goal.id);
    setDeleting(false);
    setShowDelete(false);
  };

  return (
    <>
      <div className="card-hover p-5 flex flex-col gap-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <Badge value={goal.status} />
          <div className="flex gap-1">
            <button onClick={() => onEdit(goal)} className="btn-ghost p-1.5 text-xs opacity-0 group-hover:opacity-100">
              ✎
            </button>
            {(role === 'ADMIN' || true) && (
              <button onClick={() => setShowDelete(true)} className="btn-ghost p-1.5 text-zinc-600 hover:text-red-400 text-xs">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <Link
            href={`/workspaces/${workspaceId}/goals/${goal.id}`}
            className="font-display font-semibold text-white hover:text-violet-300 transition-colors line-clamp-2"
          >
            {goal.title}
          </Link>
          {goal.description && (
            <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{goal.description}</p>
          )}
        </div>

        {/* Progress bar */}
        {goal.milestones?.length > 0 && (
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>{goal.milestones.length} milestones</span>
              <span>{avgProgress}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${avgProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Avatar name={goal.owner?.name} avatarUrl={goal.owner?.avatarUrl} size="xs" />
            <span className="text-zinc-500 truncate">{goal.owner?.name}</span>
          </div>

          {goal.dueDate && (
            <span className={`${isOverdue ? 'text-red-400' : 'text-zinc-600'}`}>
              {isOverdue ? '⚠ ' : ''}
              {format(new Date(goal.dueDate), 'MMM d')}
            </span>
          )}
        </div>

        {/* Counts */}
        <div className="flex gap-3 pt-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-600">
            {goal._count?.actionItems || 0} tasks
          </span>
          <span className="text-xs text-zinc-600">
            {goal._count?.progressUpdates || 0} updates
          </span>
          <Link
            href={`/workspaces/${workspaceId}/goals/${goal.id}`}
            className="ml-auto text-xs text-violet-500 hover:text-violet-400"
          >
            View →
          </Link>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete goal?"
        message={`"${goal.title}" and all its milestones will be permanently deleted.`}
      />
    </>
  );
}