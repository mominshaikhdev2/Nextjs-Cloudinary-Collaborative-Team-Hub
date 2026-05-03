'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { goalApi, milestoneApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function GoalDetailPage() {
  const { workspaceId, goalId } = useParams();
  const router = useRouter();
  const [goal, setGoal] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updateText, setUpdateText] = useState('');
  const [posting, setPosting] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);

  useEffect(() => {
    fetchGoal();
  }, [goalId]);

  const fetchGoal = async () => {
    try {
      const { data } = await goalApi.get(workspaceId, goalId);
      setGoal(data.goal);
      setUpdates(data.goal.progressUpdates || []);
    } catch {
      router.replace(`/workspaces/${workspaceId}/goals`);
    } finally {
      setLoading(false);
    }
  };

  const postUpdate = async (e) => {
    e.preventDefault();
    if (!updateText.trim()) return;
    setPosting(true);
    try {
      const { data } = await goalApi.addUpdate(workspaceId, goalId, { content: updateText });
      setUpdates((prev) => [data.update, ...prev]);
      setUpdateText('');
    } catch {
      toast.error('Failed to post update');
    } finally {
      setPosting(false);
    }
  };

  const addMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    setAddingMilestone(true);
    try {
      const { data } = await milestoneApi.create(workspaceId, goalId, { title: newMilestone });
      setGoal((prev) => ({ ...prev, milestones: [...(prev.milestones || []), data.milestone] }));
      setNewMilestone('');
      toast.success('Milestone added');
    } catch {
      toast.error('Failed to add milestone');
    } finally {
      setAddingMilestone(false);
    }
  };

  const updateMilestoneProgress = async (milestoneId, progress) => {
    try {
      const status = progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'PENDING';
      const { data } = await milestoneApi.update(workspaceId, goalId, milestoneId, { progress, status });
      setGoal((prev) => ({
        ...prev,
        milestones: prev.milestones.map((m) => m.id === milestoneId ? data.milestone : m),
      }));
    } catch {
      toast.error('Failed to update milestone');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-zinc-800 rounded" />
        <div className="card p-6 space-y-3">
          <div className="h-4 w-1/2 bg-zinc-800 rounded" />
          <div className="h-3 w-3/4 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!goal) return null;

  const avgProgress = goal.milestones?.length
    ? Math.round(goal.milestones.reduce((a, m) => a + m.progress, 0) / goal.milestones.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href={`/workspaces/${workspaceId}/goals`} className="hover:text-zinc-300">Goals</Link>
        <span>/</span>
        <span className="text-zinc-300 truncate">{goal.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Goal header */}
          <div className="card p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-2xl font-bold text-white">{goal.title}</h1>
              <Badge value={goal.status} />
            </div>
            {goal.description && <p className="text-zinc-400">{goal.description}</p>}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">Owner</span>
                <div className="flex items-center gap-1.5">
                  <Avatar name={goal.owner?.name} avatarUrl={goal.owner?.avatarUrl} size="xs" />
                  <span className="text-zinc-300">{goal.owner?.name}</span>
                </div>
              </div>
              {goal.dueDate && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600">Due</span>
                  <span className="text-zinc-300">{format(new Date(goal.dueDate), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Milestones */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Milestones</h2>
              <div className="text-sm text-zinc-500">{avgProgress}% avg progress</div>
            </div>

            <div className="space-y-4">
              {goal.milestones?.map((m) => (
                <div key={m.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${m.status === 'COMPLETED' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                        {m.title}
                      </span>
                      <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">{m.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          m.status === 'COMPLETED' ? 'bg-emerald-500' :
                          m.progress > 60 ? 'bg-violet-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={m.progress}
                    onChange={(e) => updateMilestoneProgress(m.id, parseInt(e.target.value))}
                    className="w-24 accent-violet-500"
                  />
                </div>
              ))}

              {/* Add milestone */}
              <form onSubmit={addMilestone} className="flex gap-2 pt-2">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Add milestone…"
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                />
                <button type="submit" disabled={addingMilestone} className="btn-secondary flex-shrink-0">
                  {addingMilestone ? '…' : 'Add'}
                </button>
              </form>
            </div>
          </div>

          {/* Progress updates */}
          <div className="card p-6">
            <h2 className="section-title mb-4">Activity Feed</h2>

            <form onSubmit={postUpdate} className="flex gap-2 mb-6">
              <input
                className="input flex-1 text-sm"
                placeholder="Post a progress update…"
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
              />
              <button type="submit" disabled={posting || !updateText.trim()} className="btn-primary flex-shrink-0">
                {posting ? '…' : 'Post'}
              </button>
            </form>

            <div className="space-y-4">
              {updates.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-6">No updates yet. Post the first one!</p>
              ) : (
                updates.map((u) => (
                  <div key={u.id} className="flex gap-3">
                    <Avatar name={u.user?.name} avatarUrl={u.user?.avatarUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-white">{u.user?.name}</span>
                        <span className="text-xs text-zinc-600">
                          {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-0.5">{u.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: linked action items */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="section-title mb-3">Linked Tasks</h2>
            <div className="space-y-2">
              {goal.actionItems?.length === 0 && (
                <p className="text-zinc-600 text-sm">No tasks linked to this goal.</p>
              )}
              {goal.actionItems?.map((item) => (
                <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.status === 'DONE' ? 'bg-emerald-500' :
                    item.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-zinc-600'
                  }`} />
                  <div className="min-w-0">
                    <p className={`text-sm ${item.status === 'DONE' ? 'text-zinc-600 line-through' : 'text-zinc-300'} truncate`}>
                      {item.title}
                    </p>
                    {item.assignee && (
                      <p className="text-xs text-zinc-600">{item.assignee.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}