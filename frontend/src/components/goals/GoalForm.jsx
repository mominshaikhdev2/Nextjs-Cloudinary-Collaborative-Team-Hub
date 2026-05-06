'use client';
import { useState, useEffect } from 'react';
import { goalApi, workspaceApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED'];

export default function GoalForm({ workspaceId, initial, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    status: initial?.status || 'NOT_STARTED',
    dueDate: initial?.dueDate ? initial.dueDate.split('T')[0] : '',
    ownerId: initial?.ownerId || '',
  });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    workspaceApi.getMembers(workspaceId).then(({ data }) => setMembers(data.members));
  }, [workspaceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data;
      if (initial) {
        ({ data } = await goalApi.update(workspaceId, initial.id, form));
        toast.success('Goal updated');
      } else {
        ({ data } = await goalApi.create(workspaceId, form));
        toast.success('Goal created');
      }
      onSuccess(data.goal);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Title *</label>
        <input
          className="input"
          placeholder="e.g. Launch v2.0 product"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          maxLength={200}
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="What does success look like?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Due date</label>
          <input
            type="date"
            className="input"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="label">Owner</label>
        <select
          className="input"
          value={form.ownerId}
          onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
        >
          <option value="">Select owner…</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>{m.user.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? 'Saving…' : initial ? 'Update goal' : 'Create goal'}
        </button>
      </div>
    </form>
  );
}