'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useThemeStore } from '@/store/themeStore';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import CommandPalette from '@/components/ui/CommandPalette';
import { useUIStore } from '@/store/uiStore';

export default function AppLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { initTheme, toggleTheme } = useThemeStore();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 1. Fixed: Added missing dependencies and used an async wrapper[cite: 5]
  useEffect(() => {
    const initApp = async () => {
      // Initialize theme
      initTheme();

      // Initialize auth and handle routing
      await initialize();
      
      const { isAuthenticated: currentAuth } = useAuthStore.getState();
      if (!currentAuth) {
        router.replace('/login');
      } else {
        fetchWorkspaces();
      }
    };

    initApp();
  }, [fetchWorkspaces, initTheme, initialize, router]); // Dependency array satisfied[cite: 5]

  // ── Global keyboard shortcuts ──────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;

      // ⌘K — Command Palette
      if (meta && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }

      // Don't fire shortcuts when typing in inputs
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (document.activeElement?.contentEditable === 'true') return;

      switch (e.key) {
        // T — toggle theme
        case 't':
        case 'T':
          toggleTheme();
          break;
      }
    };

    // Two-key sequence handler (g+d, g+g, etc.)
    let pending = null;
    let pendingTimer = null;

    const handleSequence = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (pending === 'g') {
        clearTimeout(pendingTimer);
        pending = null;

        const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
        switch (e.key) {
          case 'd': router.push('/dashboard'); break;
          case 'g': if (workspaceId) router.push(`/workspaces/${workspaceId}/goals`); break;
          case 'k': if (workspaceId) router.push(`/workspaces/${workspaceId}/action-items`); break;
          case 'a': if (workspaceId) router.push(`/workspaces/${workspaceId}/announcements`); break;
          case 'n': if (workspaceId) router.push(`/workspaces/${workspaceId}/analytics`); break;
          case 's': if (workspaceId) router.push(`/workspaces/${workspaceId}/settings`); break;
          case 'p': router.push('/profile'); break;
        }
        return;
      }

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        pending = 'g';
        pendingTimer = setTimeout(() => { pending = null; }, 1000);
      }

      if (e.key === '?') {
        setPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keydown', handleSequence);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keydown', handleSequence);
      clearTimeout(pendingTimer);
    };
  }, [toggleTheme, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--th-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-display font-bold text-lg">T</span>
          </div>
          <div className="text-sm" style={{ color: 'var(--th-text-3)' }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--th-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header onPaletteOpen={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto animate-slide-up">{children}</div>
        </main>
      </div>

      {/* ⌘K Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}