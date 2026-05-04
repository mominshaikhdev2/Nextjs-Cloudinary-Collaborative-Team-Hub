'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore1';
import toast from 'react-hot-toast';

// ── Command definitions ────────────────────────────────
const staticCommands = (workspaces, currentWsId, router, toggleTheme, logout) => {
  const nav = (path, label, icon, section = 'Navigate') => ({
    id: path,
    label,
    icon,
    section,
    action: () => router.push(path),
    keywords: [label.toLowerCase()],
  });

  const wsCommands = workspaces.flatMap((ws) => [
    {
      id: `ws-${ws.id}`,
      label: ws.name,
      icon: null,
      iconDot: ws.accentColor,
      section: 'Switch Workspace',
      action: () => router.push(`/workspaces/${ws.id}`),
      keywords: [ws.name.toLowerCase(), 'workspace', 'switch'],
    },
  ]);

  const workspaceActions = currentWsId ? [
    nav(`/workspaces/${currentWsId}/goals/new`, 'New Goal', '◎', 'Quick Actions'),
    nav(`/workspaces/${currentWsId}/action-items`, 'Open Kanban Board', '◻', 'Quick Actions'),
    nav(`/workspaces/${currentWsId}/announcements`, 'View Announcements', '◉', 'Quick Actions'),
    nav(`/workspaces/${currentWsId}/analytics`, 'Open Analytics', '◇', 'Quick Actions'),
    nav(`/workspaces/${currentWsId}/settings`, 'Workspace Settings', '⚙', 'Quick Actions'),
  ] : [];

  return [
    nav('/dashboard', 'Dashboard', '▦'),
    nav('/profile', 'Profile Settings', '◈'),
    ...workspaceActions,
    ...wsCommands,
    {
      id: 'theme-toggle',
      label: 'Toggle Light / Dark Theme',
      icon: '☾',
      section: 'Preferences',
      action: toggleTheme,
      keywords: ['theme', 'dark', 'light', 'mode'],
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      icon: '⌨',
      section: 'Preferences',
      action: () => toast('Shortcuts: ⌘K palette · G then D dashboard · G then G goals · T toggle theme', { duration: 5000 }),
      keywords: ['keyboard', 'shortcuts', 'help'],
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: '→',
      section: 'Account',
      action: logout,
      keywords: ['logout', 'sign out', 'exit'],
    },
  ];
};

export default function CommandPalette({ isOpen, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const { workspaces, currentWorkspace } = useWorkspaceStore();
  const { toggleTheme } = useThemeStore();
  const { logout } = useAuthStore();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const currentWsId = currentWorkspace?.id ||
    pathname.match(/\/workspaces\/([^/]+)/)?.[1];

  const commands = staticCommands(workspaces, currentWsId, router, toggleTheme, logout);

  // Filter
  const filtered = query.trim() === ''
    ? commands
    : commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.section?.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.includes(q))
        );
      });

  // Group by section
  const grouped = filtered.reduce((acc, cmd) => {
    const sec = cmd.section || 'Other';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(cmd);
    return acc;
  }, {});

  // Flatten for keyboard nav
  const flat = Object.values(grouped).flat();

  const execute = useCallback((cmd) => {
    onClose();
    setQuery('');
    setSelected(0);
    setTimeout(() => cmd.action(), 50);
  }, [onClose]);

  // Fix 1: Use an async wrapper to avoid synchronous setState during effect[cite: 3]
  useEffect(() => {
    if (isOpen) {
      const resetOnOpen = async () => {
        setQuery('');
        setSelected(0);
      };
      resetOnOpen();
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Fix 2: Error removed by moving logic to the onChange event handler below[cite: 4]

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, flat.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flat[selected]) execute(flat[selected]);
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!isOpen) return null;

  let globalIdx = 0;

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette-box" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--th-border)' }}>
          <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--th-text-3)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--th-text-1)' }}
            placeholder="Search commands, pages, workspaces…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0); // Reset selection on typing (replaces useEffect)[cite: 4]
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'var(--th-surface-2)', color: 'var(--th-text-3)', border: '1px solid var(--th-border-2)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-[400px] py-2">
          {flat.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--th-text-3)' }}>
              No commands found for "<span style={{ color: 'var(--th-text-1)' }}>{query}</span>"
            </div>
          ) : (
            Object.entries(grouped).map(([section, cmds]) => (
              <div key={section}>
                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--th-text-4)' }}>
                  {section}
                </div>
                {cmds.map((cmd) => {
                  const idx = globalIdx++;
                  const isSelected = selected === idx;
                  return (
                    <button
                      key={cmd.id}
                      data-index={idx}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelected(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: isSelected ? 'var(--th-surface-2)' : 'transparent',
                        color: isSelected ? 'var(--th-text-1)' : 'var(--th-text-2)',
                      }}
                    >
                      {cmd.iconDot ? (
                        <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                          style={{ background: cmd.iconDot }}>
                          {cmd.label.slice(0, 1).toUpperCase()}
                        </span>
                      ) : (
                        <span className="w-5 h-5 flex items-center justify-center text-sm flex-shrink-0"
                          style={{ color: isSelected ? '#a78bfa' : 'var(--th-text-4)' }}>
                          {cmd.icon}
                        </span>
                      )}
                      <span className="text-sm font-medium truncate">{cmd.label}</span>
                      {isSelected && (
                        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: 'var(--th-surface-3)', color: 'var(--th-text-3)', border: '1px solid var(--th-border-2)' }}>
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t text-[11px]"
          style={{ borderColor: 'var(--th-border)', color: 'var(--th-text-4)' }}>
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
          <span className="ml-auto">⌘K to open anytime</span>
        </div>
      </div>
    </div>
  );
}