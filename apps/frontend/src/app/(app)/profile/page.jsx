'use client';
import { useState, useRef } from 'react';
import { userApi } from '@/lib/api1';
import { useAuthStore } from '@/store/authStore1';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef();

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await userApi.updateProfile(form);
      updateUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await userApi.changePassword(passwordForm);
      toast.success('Password changed. Please sign in again.');
      setTimeout(() => logout(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await userApi.uploadAvatar(fd);
      updateUser(data.user);
      toast.success('Avatar updated');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="page-header">Profile</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage your account settings</p>
      </div>

      {/* Avatar */}
      <div className="card p-6">
        <h2 className="section-title mb-5">Avatar</h2>
        <div className="flex items-center gap-5">
          <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="xl" />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadAvatar}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="btn-secondary"
            >
              {uploadingAvatar ? 'Uploading…' : 'Change photo'}
            </button>
            <p className="text-xs text-zinc-600 mt-2">JPG, PNG, WEBP — max 5MB</p>
          </div>
        </div>
      </div>

      {/* Profile info */}
      <div className="card p-6">
        <h2 className="section-title mb-5">Personal info</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input opacity-50 cursor-not-allowed" value={user?.email} disabled />
            <p className="text-xs text-zinc-600 mt-1">Email cannot be changed.</p>
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6">
        <h2 className="section-title mb-5">Change password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              className="input"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Sign out */}
      <div className="card p-6 border-red-900/20">
        <h2 className="section-title text-red-400 mb-3">Sign out</h2>
        <p className="text-zinc-500 text-sm mb-4">Sign out of all devices.</p>
        <button onClick={logout} className="btn-danger">Sign out</button>
      </div>
    </div>
  );
}