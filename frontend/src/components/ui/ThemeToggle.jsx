'use client';
import { useThemeStore } from '@/store/themeStore';

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme, toggleTheme } = useThemeStore();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="btn-ghost p-2 relative"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode (T)`}
      >
        {theme === 'dark' ? (
          /* Sun icon */
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="5"/>
            <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        ) : (
          /* Moon icon */
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className="flex gap-1 th-surface rounded-xl p-1 border th-border">
      {[
        { value: 'light', label: '☀ Light' },
        { value: 'dark',  label: '☾ Dark' },
        { value: 'system', label: '⚙ System' },
      ].map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            theme === opt.value
              ? 'bg-violet-600 text-white shadow-sm'
              : 'th-text-3 hover:th-text-2'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}