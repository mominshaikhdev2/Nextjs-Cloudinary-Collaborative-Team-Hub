'use client';
import { useUIStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Header({ onPaletteOpen }) {
  const { toggleSidebar } = useUIStore();
  const { currentWorkspace } = useWorkspaceStore();

  return (
    <header
      className="h-14 border-b sticky top-0 z-20 flex items-center justify-between px-4 md:px-6"
      style={{
        background: 'var(--th-bg)',
        borderColor: 'var(--th-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden btn-ghost p-2"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Workspace pill */}
      {currentWorkspace && (
        <div className="hidden lg:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: currentWorkspace.accentColor }} />
          <span className="text-sm font-medium" style={{ color: 'var(--th-text-2)' }}>
            {currentWorkspace.name}
          </span>
        </div>
      )}
      <div className="lg:hidden" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* ⌘K search trigger */}
        <button
          onClick={onPaletteOpen}
          className="hidden md:flex items-center gap-2 btn-ghost text-xs px-3"
          style={{ color: 'var(--th-text-3)' }}
          title="Open command palette (⌘K)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <span>Search</span>
          <div className="flex gap-0.5 ml-1">
            <kbd className="text-[10px] px-1 py-0.5 rounded"
              style={{ background: 'var(--th-surface-2)', border: '1px solid var(--th-border-2)' }}>
              ⌘
            </kbd>
            <kbd className="text-[10px] px-1 py-0.5 rounded"
              style={{ background: 'var(--th-surface-2)', border: '1px solid var(--th-border-2)' }}>
              K
            </kbd>
          </div>
        </button>

        <ThemeToggle compact />
        <NotificationBell />
      </div>
    </header>
  );
}