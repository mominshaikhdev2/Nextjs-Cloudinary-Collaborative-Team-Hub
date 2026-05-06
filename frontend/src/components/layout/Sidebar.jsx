'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUIStore } from '@/store/uiStore';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
];

const WORKSPACE_NAV = (id) => [
  { href: `/workspaces/${id}`, label: 'Overview', icon: '◈' },
  { href: `/workspaces/${id}/goals`, label: 'Goals', icon: '◎' },
  { href: `/workspaces/${id}/action-items`, label: 'Action Items', icon: '◻' },
  { href: `/workspaces/${id}/announcements`, label: 'Announcements', icon: '◉' },
  { href: `/workspaces/${id}/analytics`, label: 'Analytics', icon: '◇' },
  { href: `/workspaces/${id}/settings`, label: 'Settings', icon: '⚙' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { workspaces, currentWorkspace, onlineUsers } = useWorkspaceStore();
  const { sidebarOpen } = useUIStore();
  const { user } = useAuthStore();

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 z-40
        flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      style={{
        background: 'var(--th-bg)',
        borderRight: '1px solid var(--th-border)',
        transition: 'transform 0.3s, background 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Logo */}
      <div
        className="p-4"
        style={{ borderBottom: '1px solid var(--th-border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
            <span className="text-white font-display font-bold text-sm">T</span>
          </div>
          <div>
            <div className="font-display font-bold text-sm leading-tight th-text-1">Team Hub</div>
            {currentWorkspace && (
              <div className="text-xs th-text-3 truncate max-w-[140px]">{currentWorkspace.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="text-xs w-4 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* Workspaces */}
        <div className="pt-4 pb-1">
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest th-text-4">
              Workspaces
            </span>
            <Link
              href="/workspaces/new"
              className="th-text-3 transition-colors text-lg leading-none"
              style={{ color: 'var(--th-text-3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--th-text-1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--th-text-3)'; }}
            >
              +
            </Link>
          </div>

          {workspaces.map((ws) => (
            <div key={ws.id}>
              <Link
                href={`/workspaces/${ws.id}`}
                className={`sidebar-link ${pathname.startsWith(`/workspaces/${ws.id}`) ? 'active' : ''}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: ws.accentColor }}
                />
                <span className="truncate">{ws.name}</span>
                {ws.role === 'ADMIN' && (
                  <span
                    className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      color: 'var(--th-text-4)',
                      background: 'var(--th-surface-2)',
                    }}
                  >
                    A
                  </span>
                )}
              </Link>

              {/* Sub-nav for active workspace */}
              {pathname.startsWith(`/workspaces/${ws.id}`) && (
                <div
                  className="ml-5 mt-1 space-y-0.5 pl-3"
                  style={{ borderLeft: '1px solid var(--th-border)' }}
                >
                  {WORKSPACE_NAV(ws.id).slice(1).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all"
                      style={
                        pathname === item.href
                          ? { color: 'var(--th-text-1)', background: 'var(--th-surface-2)' }
                          : { color: 'var(--th-text-3)', background: 'transparent' }
                      }
                      onMouseEnter={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = 'var(--th-text-2)';
                          e.currentTarget.style.background = 'var(--th-surface-2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = 'var(--th-text-3)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {workspaces.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-xs th-text-4">No workspaces yet.</p>
              <Link href="/workspaces/new" className="text-violet-400 text-xs hover:text-violet-300">
                Create one →
              </Link>
            </div>
          )}
        </div>

        {/* Online users */}
        {onlineUsers.length > 0 && currentWorkspace && (
          <div className="pt-4">
            <div className="px-3 mb-2 text-xs font-semibold th-text-4 uppercase tracking-widest">
              Online ({onlineUsers.length})
            </div>
            <div className="space-y-1">
              {onlineUsers.slice(0, 5).map((u) => (
                <div key={u.userId} className="flex items-center gap-2 px-3 py-1">
                  <div className="relative">
                    <Avatar name={u.name} avatarUrl={u.avatarUrl} size="xs" />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full"
                      style={{ border: '2px solid var(--th-bg)' }}
                    />
                  </div>
                  <span className="text-xs th-text-2 truncate">{u.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User */}
      <div
        className="p-3"
        style={{ borderTop: '1px solid var(--th-border)' }}
      >
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--th-surface-2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
          <div className="min-w-0">
            <div className="text-sm font-medium th-text-1 truncate">{user?.name}</div>
            <div className="text-xs th-text-3 truncate">{user?.email}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
