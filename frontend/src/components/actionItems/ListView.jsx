'use client';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { format } from 'date-fns';

const ALL_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export default function ListView({ columns, onEdit, onDelete, onStatusChange }) {
  const allItems = ALL_STATUSES.flatMap((s) => columns[s] || []);

  if (allItems.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-zinc-500">No tasks yet.</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-zinc-800">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-zinc-600 uppercase tracking-wide">
        <div className="col-span-5">Task</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Priority</div>
        <div className="col-span-2">Assignee</div>
        <div className="col-span-1">Due</div>
      </div>

      {allItems.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-zinc-800/50 transition-colors group"
        >
          <div className="col-span-5 min-w-0">
            <button
              onClick={() => onEdit(item)}
              className={`text-sm font-medium text-left truncate w-full hover:text-violet-400 transition-colors ${
                item.status === 'DONE' ? 'text-zinc-500 line-through' : 'text-zinc-200'
              }`}
            >
              {item.title}
            </button>
            {item.goal && <p className="text-[10px] text-violet-600 mt-0.5 truncate">{item.goal.title}</p>}
          </div>

          <div className="col-span-2">
            <select
              className="bg-transparent text-xs border-none outline-none cursor-pointer text-zinc-400 hover:text-zinc-200"
              value={item.status}
              onChange={(e) => onStatusChange(item.id, e.target.value, item)}
            >
              {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <Badge value={item.priority} />
          </div>

          <div className="col-span-2">
            {item.assignee ? (
              <div className="flex items-center gap-1.5">
                <Avatar name={item.assignee.name} avatarUrl={item.assignee.avatarUrl} size="xs" />
                <span className="text-xs text-zinc-500 truncate">{item.assignee.name}</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-700">—</span>
            )}
          </div>

          <div className="col-span-1 flex items-center justify-between">
            <span className="text-xs text-zinc-600">
              {item.dueDate ? format(new Date(item.dueDate), 'MMM d') : '—'}
            </span>
            <button
              onClick={() => onDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}