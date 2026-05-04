'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { workspaceApi } from '@/lib/api1';
import { useWorkspaceStore } from '@/store/workspaceStore';

const COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D'];

export default function NewWorkspacePage() {
  const router = useRouter();
  const { addWorkspace } = useWorkspaceStore();
  const [form, setForm] = useState({ name: '', description: '', accentColor: '#7C3AED' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await workspaceApi.create(form);
      addWorkspace(data.workspace);
      toast.success('Workspace created!');
      router.push(`/workspaces/${data.workspace.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="page-header">Create workspace</h1>
        <p className="text-zinc-500 mt-1">Set up a new team workspace.</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-white text-lg shadow-lg flex-shrink-0 transition-all duration-300"
              style={{ background: form.accentColor, boxShadow: `0 0 24px ${form.accentColor}50` }}
            >
              {form.name ? form.name.slice(0, 2).toUpperCase() : 'WS'}
            </div>
            <div>
              <div className="font-display font-semibold text-white">{form.name || 'Workspace name'}</div>
              <div className="text-zinc-500 text-sm">{form.description || 'Description…'}</div>
            </div>
          </div>

          <div>
            <label className="label">Workspace name *</label>
            <input
              className="input"
              placeholder="e.g. Product Team"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={80}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="What does this workspace focus on?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
            />
          </div>

          <div>
            <label className="label">Accent color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, accentColor: c })}
                  className={`w-8 h-8 rounded-lg transition-all ${form.accentColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}