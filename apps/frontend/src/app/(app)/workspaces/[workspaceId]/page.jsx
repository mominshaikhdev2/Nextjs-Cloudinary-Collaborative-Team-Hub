'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { workspaceApi, analyticsApi } from '@/lib/api';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { connectSocket, joinWorkspace, leaveWorkspaceRoom } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { formatDistanceToNow } from 'date-fns';

export default function WorkspaceOverviewPage() {
  const { workspaceId } = useParams();
  const router = useRouter();
  const { setCurrentWorkspace, setOnlineUsers, onlineUsers } = useWorkspaceStore();
  const { accessToken } = useAuthStore();
  const [workspace, setWorkspace] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    setupSocket();
    return () => leaveWorkspaceRoom(workspaceId);
  }, [workspaceId]);

  const loadData = async () => {
    try {
      const [wsRes, statsRes, activityRes] = await Promise.all([
        workspaceApi.get(workspaceId),
        analyticsApi.stats(workspaceId),
        analyticsApi.activity(workspaceId, { limit: 10 }),
      ]);
      setWorkspace(wsRes.data.workspace);
      setCurrentWorkspace(wsRes.data.workspace, wsRes.data.role);
      setStats(statsRes.data.stats);
      setActivity(activityRes.data.logs);
    } catch {
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    const token = typeof window !== 'undefined' ? window.__accessToken : null;
    if (token) {
      connectSocket(token);
      const { getSocket } = require('@/lib/socket');
      const socket = getSocket();
      if (socket) {
        joinWorkspace(workspaceId);
        socket.on('workspace:online', setOnlineUsers);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-800 rounded shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card p-5 h-28 shimmer" />)}
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  const QUICK_LINKS = [
    { href: `/workspaces/${workspaceId}/goals`, label: 'Goals', icon: '◎', desc: 'Track shared objectives' },
    { href: `/workspaces/${workspaceId}/action-items`, label: 'Kanban Board', icon: '◻', desc: 'Manage tasks visually' },
    { href: `/workspaces/${workspaceId}/announcements`, label: 'Announcements', icon: '◉', desc: 'Team-wide updates' },
    { href: `/workspaces/${workspaceId}/analytics`, label: 'Analytics', icon: '◇', desc: 'Charts & insights' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-white text-lg shadow-lg flex-shrink-0"
            style={{ background: workspace.accentColor, boxShadow: `0 0 24px ${workspace.accentColor}40` }}
          >
            {workspace.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="page-header">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-zinc-500 text-sm mt-0.5">{workspace.description}</p>
            )}
          </div>
        </div>
        <Link href={`/workspaces/${workspaceId}/settings`} className="btn-ghost flex-shrink-0">
          Settings
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Goals', value: stats.totalGoals, sub: `${stats.completionRate}% done`, color: 'text-violet-400' },
            { label: 'Completed', value: stats.completedGoals, sub: 'Goals finished', color: 'text-emerald-400' },
            { label: 'Tasks done', value: stats.completedThisWeek, sub: 'This week', color: 'text-blue-400' },
            { label: 'Overdue', value: stats.overdueItems, sub: 'Need attention', color: 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div>
                <div className="text-zinc-300 text-sm font-medium">{s.label}</div>
                <div className="text-zinc-600 text-xs">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick links */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="section-title mb-3">Quick access</h2>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="card-hover p-4 flex items-start gap-3">
                  <span className="text-lg text-violet-400">{l.icon}</span>
                  <div>
                    <div className="font-medium text-zinc-200 text-sm">{l.label}</div>
                    <div className="text-zinc-600 text-xs mt-0.5">{l.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div>
            <h2 className="section-title mb-3">Recent activity</h2>
            <div className="card divide-y divide-zinc-800">
              {activity.length === 0 ? (
                <div className="p-6 text-center text-zinc-600 text-sm">No activity yet.</div>
              ) : (
                activity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-4">
                    <Avatar name={log.user?.name} avatarUrl={log.user?.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-300">
                        <span className="font-medium text-white">{log.user?.name}</span>
                        {' '}{log.action.toLowerCase()}{' '}
                        <span className="text-zinc-400">{log.entityType.toLowerCase()}</span>
                        {log.metadata?.title && (
                          <span className="text-zinc-300"> — {log.metadata.title}</span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Members + online */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Members</h2>
              <Link href={`/workspaces/${workspaceId}/settings`} className="text-xs text-zinc-500 hover:text-violet-400">
                Manage →
              </Link>
            </div>
            <div className="card divide-y divide-zinc-800">
              {workspace.members?.slice(0, 8).map((m) => {
                const isOnline = onlineUsers.some((u) => u.userId === m.userId);
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3">
                    <div className="relative">
                      <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size="sm" />
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-zinc-900" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-200 truncate">{m.user.name}</div>
                      <div className="text-xs text-zinc-600 truncate">{m.user.email}</div>
                    </div>
                    <Badge value={m.role} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}