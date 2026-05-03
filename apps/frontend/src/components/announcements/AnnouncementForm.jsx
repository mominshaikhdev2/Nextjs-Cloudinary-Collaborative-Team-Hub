'use client';
import { useState } from 'react';
import { announcementApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AnnouncementForm({ workspaceId, initial, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    content: initial?.content || '',
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data;
      if (initial) {
        ({ data } = await announcementApi.update(workspaceId, initial.id, form));
        toast.success('Announcement updated');
      } else {
        ({ data } = await announcementApi.create(workspaceId, form));
        toast.success('Announcement posted');
      }
      onSuccess(data.announcement);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
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
          placeholder="Announcement title…"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          maxLength={200}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label mb-0">Content * (HTML supported)</label>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="text-xs text-violet-400 hover:text-violet-300"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {preview ? (
          <div
            className="card p-4 min-h-[180px] rich-content text-sm"
            dangerouslySetInnerHTML={{ __html: form.content }}
          />
        ) : (
          <textarea
            className="input resize-none font-mono text-sm"
            rows={8}
            placeholder="<h2>Update</h2><p>Write your announcement here…</p>"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
          />
        )}
        <p className="text-xs text-zinc-600 mt-1">Supports HTML: &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? 'Posting…' : initial ? 'Update' : 'Post'}
        </button>
      </div>
    </form>
  );
}