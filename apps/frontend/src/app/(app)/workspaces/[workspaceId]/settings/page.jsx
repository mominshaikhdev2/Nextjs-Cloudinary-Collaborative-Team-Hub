'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { workspaceApi } from '@/lib/api1';
import api from '@/lib/api1';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore1';
import {
  DEFAULT_MATRIX,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  resolveMatrix,
} from '@/lib/permissions';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

const COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#BE185D'];
const TABS = ['General', 'Members', 'Permissions', 'Danger'];

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const router = useRouter();
  const { currentWorkspace, currentRole, updateWorkspace, removeWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();

  const [tab, setTab] = useState('General');
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', accentColor: '#7C3AED' });
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBER' });
  const [inviting, setInviting] = useState(false);
  const [showDeleteWs, setShowDeleteWs] = useState(false);
  const [deletingWs, setDeletingWs] = useState(false);

  // RBAC state
  const [permMatrix, setPermMatrix] = useState(null);
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      setForm({
        name: currentWorkspace.name || '',
        description: currentWorkspace.description || '',
        accentColor: currentWorkspace.accentColor || '#7C3AED',
      });
    }
    fetchMembers();
    fetchPermissions();
  }, [workspaceId, currentWorkspace]);

  const fetchMembers = async () => {
    const { data } = await workspaceApi.getMembers(workspaceId);
    setMembers(data.members);
  };

  const fetchPermissions = async () => {
    try {
      const { data } = await api.get(`/api/workspaces/${workspaceId}/permissions`);
      setPermMatrix(data.permissions || null);
    } catch { /* use defaults */ }
  };

  // Resolved matrix = defaults merged with workspace overrides
  const resolved = resolveMatrix(permMatrix);

  const togglePermission = (role, perm) => {
    // Protect admin essentials
    if (role === 'ADMIN' && (perm === 'manageWorkspace' || perm === 'manageMembers')) return;
    setPermMatrix((prev) => {
      const next = prev ? JSON.parse(JSON.stringify(prev)) : {};
      if (!next[role]) next[role] = {};
      next[role][perm] = !resolved[role][perm];
      return next;
    });
  };

  const resetToDefaults = () => {
    setPermMatrix(null);
    toast.success('Reset to defaults (unsaved)');
  };

  const savePermissions = async () => {
    setSavingPerms(true);
    try {
      const { data } = await api.patch(`/api/workspaces/${workspaceId}/permissions`, {
        permissions: permMatrix || DEFAULT_MATRIX,
      });
      updateWorkspace({ permissions: data.permissions });
      toast.success('Permissions saved');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  const saveWorkspace = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await workspaceApi.update(workspaceId, form);
      updateWorkspace(data.workspace);
      toast.success('Workspace updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await workspaceApi.invite(workspaceId, inviteForm);
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setInviteForm({ email: '', role: 'MEMBER' });
      setShowInvite(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invite failed');
    } finally {
      setInviting(false);
    }
  };

  const removeUser = async (userId) => {
    try {
      await workspaceApi.removeMember(workspaceId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Remove failed');
    }
  };

  const updateRole = async (userId, role) => {
    try {
      await workspaceApi.updateMemberRole(workspaceId, userId, { role });
      setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m));
      toast.success('Role updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteWorkspaceFn = async () => {
    setDeletingWs(true);
    try {
      await workspaceApi.delete(workspaceId);
      removeWorkspace(workspaceId);
      router.replace('/dashboard');
      toast.success('Workspace deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeletingWs(false);
    }
  };

  if (currentRole !== 'ADMIN') {
    return (
      <div className="card p-12 text-center">
        <p className="th-text-3">Only admins can access workspace settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="page-header">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 th-surface rounded-xl p-1 border th-border w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'th-surface-2 th-text-1 shadow-sm'
                : 'th-text-3 hover:th-text-2'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {tab === 'General' && (
        <div className="card p-6">
          <h2 className="section-title mb-5">General</h2>
          <form onSubmit={saveWorkspace} className="space-y-4">
            <div>
              <label className="label">Workspace name</label>
              <input className="input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Accent color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, accentColor: c })}
                    className={`w-7 h-7 rounded-lg transition-all ${form.accentColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'hover:scale-105'}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      )}

      {/* ── Members ── */}
      {tab === 'Members' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Members ({members.length})</h2>
            <button onClick={() => setShowInvite(true)} className="btn-primary text-xs">
              + Invite member
            </button>
          </div>
          <div className="divide-y th-divide">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium th-text-1">{m.user.name}</div>
                  <div className="text-xs th-text-3">{m.user.email}</div>
                </div>
                {m.userId === user?.id ? (
                  <Badge value={m.role} />
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      className="th-surface border th-border th-text-2 text-xs rounded-lg px-2 py-1 focus:outline-none"
                      value={m.role}
                      onChange={(e) => updateRole(m.userId, e.target.value)}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                    <button onClick={() => removeUser(m.userId)}
                      className="btn-ghost p-1.5 th-text-3 hover:text-red-400 text-xs">✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Permissions (RBAC Matrix) ── */}
      {tab === 'Permissions' && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="section-title">Permission Matrix</h2>
                <p className="th-text-3 text-sm mt-1">
                  Customise what each role can do in this workspace.
                  Admins always retain workspace management access.
                </p>
              </div>
              <button onClick={resetToDefaults} className="btn-ghost text-xs flex-shrink-0">
                Reset defaults
              </button>
            </div>

            {/* Matrix header */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b th-border">
                    <th className="text-left py-2 pr-4 th-text-3 font-medium text-xs uppercase tracking-wide w-1/2">
                      Permission
                    </th>
                    <th className="text-center py-2 px-4 th-text-3 font-medium text-xs uppercase tracking-wide">
                      Admin
                    </th>
                    <th className="text-center py-2 px-4 th-text-3 font-medium text-xs uppercase tracking-wide">
                      Member
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                    <>
                      <tr key={`group-${group}`}>
                        <td colSpan={3} className="pt-4 pb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">
                            {group}
                          </span>
                        </td>
                      </tr>
                      {perms.map((perm) => {
                        const adminLocked = perm === 'manageWorkspace' || perm === 'manageMembers';
                        return (
                          <tr key={perm} className="border-b th-border last:border-0 group hover:th-surface-hover transition-colors">
                            <td className="py-2.5 pr-4">
                              <span className="th-text-2 text-sm">{PERMISSION_LABELS[perm]}</span>
                            </td>
                            {['ADMIN', 'MEMBER'].map((role) => {
                              const locked = adminLocked && role === 'ADMIN';
                              const checked = resolved[role][perm];
                              return (
                                <td key={role} className="text-center py-2.5 px-4">
                                  <button
                                    onClick={() => !locked && togglePermission(role, perm)}
                                    disabled={locked}
                                    title={locked ? 'Cannot remove from Admin' : ''}
                                    className={`w-9 h-5 rounded-full transition-all duration-200 relative
                                      ${checked ? 'bg-violet-600' : 'bg-zinc-700'}
                                      ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
                                  >
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200
                                      ${checked ? 'left-[18px]' : 'left-0.5'}`} />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t th-border">
              <button onClick={resetToDefaults} className="btn-secondary">
                Reset to defaults
              </button>
              <button onClick={savePermissions} disabled={savingPerms} className="btn-primary">
                {savingPerms ? 'Saving…' : 'Save permissions'}
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="card p-4 text-xs th-text-3 space-y-1">
            <p>🔒 Admin always retains <strong className="th-text-2">Manage Workspace</strong> and <strong className="th-text-2">Manage Members</strong> regardless of this matrix.</p>
            <p>⚙ Changes take effect immediately for all workspace members after saving.</p>
          </div>
        </div>
      )}

      {/* ── Danger ── */}
      {tab === 'Danger' && (
        <div className="card p-6 border-red-900/30">
          <h2 className="section-title text-red-400 mb-3">Danger Zone</h2>
          <p className="th-text-3 text-sm mb-4">
            Permanently delete this workspace and all its data — goals, tasks, announcements, and members. This cannot be undone.
          </p>
          <button onClick={() => setShowDeleteWs(true)} className="btn-danger">
            Delete workspace
          </button>
        </div>
      )}

      {/* Invite modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite member" size="sm">
        <form onSubmit={sendInvite} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input type="email" className="input" placeholder="colleague@company.com"
              value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={inviting} className="btn-primary flex-1 justify-center">
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteWs}
        onClose={() => setShowDeleteWs(false)}
        onConfirm={deleteWorkspaceFn}
        loading={deletingWs}
        title="Delete workspace?"
        message="All goals, tasks, and announcements will be permanently deleted. This cannot be undone."
        confirmLabel="Delete workspace"
      />
    </div>
  );
}