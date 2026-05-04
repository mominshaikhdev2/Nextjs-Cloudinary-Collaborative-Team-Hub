'use client';
import { useState, useEffect } from 'react';
import { actionItemApi, workspaceApi, goalApi } from '@/lib/api1';
import toast from 'react-hot-toast';

export default function ActionItemForm({ workspaceId, initial, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    priority: initial?.priority || 'MEDIUM',
    status: initial?.status || 'TODO',
    dueDate: initial?.dueDate ? initial.dueDate.split('T')[0] : '',
    assigneeId: initial?.assigneeId || '',
    goalId: initial?.goalId || '',
  });
  const [members, setMembers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      workspaceApi.getMembers(workspaceId),
      goalApi.list(workspaceId),
    ]).then(([mRes, gRes]) => {
      setMembers(mRes.data.members);
      setGoals(gRes.data.goals);
    });
  }, [workspaceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data;
      const payload = { ...form, assigneeId: form.assigneeId || null, goalId: form.goalId || null };
      if (initial) {
        ({ data } = await actionItemApi.update(workspaceId, initial.id, payload));
        toast.success('Task updated');
      } else {
        ({ data } = await actionItemApi.create(workspaceId, payload));
        toast.success('Task created');
      }
      onSuccess(data.item);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Title *</label>
        <input className="input" placeholder="Task description…" required maxLength={300} {...f('title')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Priority</label>
          <select className="input" {...f('priority')}>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" {...f('status')}>
            {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Due date</label>
          <input type="date" className="input" {...f('dueDate')} />
        </div>
        <div>
          <label className="label">Assignee</label>
          <select className="input" {...f('assigneeId')}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.user.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Link to goal</label>
        <select className="input" {...f('goalId')}>
          <option value="">No goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? 'Saving…' : initial ? 'Update task' : 'Create task'}
        </button>
      </div>
    </form>
  );
}