'use client';
import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { format, isPast } from 'date-fns';

const PRIORITY_DOT = {
  LOW: 'bg-zinc-500',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-amber-500',
  URGENT: 'bg-red-500',
};

export default function KanbanCard({ item, onEdit, onDelete }) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOverdue = item.dueDate && isPast(new Date(item.dueDate)) && item.status !== 'DONE';

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(item.id);
    setDeleting(false);
    setShowDelete(false);
  };

  return (
    <>
      <div
        className="bg-zinc-800 border border-zinc-700/50 rounded-xl p-3 hover:border-zinc-600 transition-all group cursor-grab active:cursor-grabbing"
        onDoubleClick={() => onEdit(item)}
      >
        {/* Priority + Actions */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[item.priority]}`} />
          <span className="text-[10px] text-zinc-600 uppercase tracking-wide">{item.priority}</span>
          <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
            >
              ✎
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        <p className={`text-sm font-medium leading-snug mb-2 ${item.status === 'DONE' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
          {item.title}
        </p>

        {item.goal && (
          <p className="text-[10px] text-violet-500 mb-2 truncate">⊲ {item.goal.title}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          {item.assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar name={item.assignee.name} avatarUrl={item.assignee.avatarUrl} size="xs" />
              <span className="text-xs text-zinc-500 truncate max-w-[80px]">{item.assignee.name}</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-700">Unassigned</span>
          )}

          {item.dueDate && (
            <span className={`text-[10px] flex-shrink-0 ${isOverdue ? 'text-red-400' : 'text-zinc-600'}`}>
              {isOverdue ? '⚠ ' : ''}{format(new Date(item.dueDate), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete task?"
        message={`"${item.title}" will be permanently deleted.`}
      />
    </>
  );
}