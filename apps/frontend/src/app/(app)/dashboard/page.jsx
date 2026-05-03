'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { workspaces, fetchWorkspaces, isLoading } = useWorkspaceStore();
  const { user } = useAuthStore();

  // Added fetchWorkspaces to the dependency array to satisfy ESLint
  useEffect(() => { 
    fetchWorkspaces(); 
  }, [fetchWorkspaces]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <h1 className="page-header">
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-zinc-500 mt-1">Here's what's happening across your workspaces.</p>
      </div>

      {/* Workspaces Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Your Workspaces</h2>
          <Link href="/workspaces/new" className="btn-primary">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 space-y-4 animate-pulse">
                <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                <div className="h-3 w-3/4 bg-zinc-800 rounded" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-zinc-800 rounded-full" />
                  <div className="h-6 w-16 bg-zinc-800 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 mx-auto flex items-center justify-center text-2xl mb-4">◈</div>
            <h3 className="font-display font-semibold text-white mb-2">No workspaces yet</h3>
            <p className="text-zinc-500 text-sm mb-6">Create your first workspace to start collaborating</p>
            <Link href="/workspaces/new" className="btn-primary inline-flex">Create workspace</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <Link key={ws.id} href={`/workspaces/${ws.id}`} className="card-hover p-5 block group">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-white text-sm shadow-lg"
                    style={{ background: ws.accentColor, boxShadow: `0 0 20px ${ws.accentColor}40` }}
                  >
                    {ws.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                    {ws.role}
                  </span>
                </div>

                <h3 className="font-display font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                  {ws.name}
                </h3>
                {ws.description && (
                  <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{ws.description}</p>
                )}

                <div className="flex gap-3 mt-4">
                  <div className="text-center">
                    <div className="font-display font-bold text-white text-lg">{ws._count?.goals || 0}</div>
                    <div className="text-zinc-600 text-xs">Goals</div>
                  </div>
                  <div className="text-center">
                    <div className="font-display font-bold text-white text-lg">{ws._count?.actionItems || 0}</div>
                    <div className="text-zinc-600 text-xs">Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="font-display font-bold text-white text-lg">{ws._count?.members || 0}</div>
                    <div className="text-zinc-600 text-xs">Members</div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Add workspace card */}
            <Link
              href="/workspaces/new"
              className="card border-dashed border-zinc-700 p-5 flex flex-col items-center justify-center gap-2 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all text-zinc-600 hover:text-violet-400 min-h-[180px]"
            >
              <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center text-xl">+</div>
              <span className="text-sm font-medium">New workspace</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}