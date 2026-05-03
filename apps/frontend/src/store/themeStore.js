import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  root.classList.remove('dark', 'light');
  root.classList.add(isDark ? 'dark' : 'light');
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' | 'light' | 'system'

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTheme: () => {
        const { theme, setTheme } = get();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      },

      initTheme: () => {
        applyTheme(get().theme);
        // Watch system preference changes when theme = 'system'
        if (typeof window !== 'undefined') {
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (get().theme === 'system') applyTheme('system');
          });
        }
      },
    }),
    { name: 'th-theme', partialize: (s) => ({ theme: s.theme }) }
  )
);