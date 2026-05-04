import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api1';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAccessToken: (token) => {
        if (typeof window !== 'undefined') window.__accessToken = token;
        set({ accessToken: token });
      },

      /**
       * initialize() — called once on app layout mount.
       *
       * Priority order:
       *  1. If we already have an accessToken in persisted state, restore it to
       *     window memory and hit /auth/me directly. This is the fast path that
       *     fires right after a fresh login (token is still valid for 15 min).
       *  2. If /auth/me returns 401 (token expired), fall through to refresh.
       *  3. If refresh also fails, clear everything and redirect to /login.
       *
       * This avoids relying on the httpOnly refresh cookie for the common case
       * (page reload within 15 min of login / navigating after login).
       */
      initialize: async () => {
        set({ isLoading: true });

        const { accessToken } = get();

        // Restore to memory so axios interceptor attaches it immediately
        if (accessToken && typeof window !== 'undefined') {
          window.__accessToken = accessToken;
        }

        // ── Fast path: existing access token ──────────────────
        if (accessToken) {
          try {
            const { data } = await authApi.me();
            set({ user: data.user, isAuthenticated: true, isLoading: false });
            connectSocket(accessToken);
            return; // ✅ done — no refresh needed
          } catch (err) {
            // 401 = token expired; any other error = fall through to refresh
            if (err?.response?.status !== 401) {
              // Network error etc. — don't log out the user
              set({ isLoading: false, isAuthenticated: true });
              return;
            }
            // Token expired — clear from memory and try refresh
            if (typeof window !== 'undefined') window.__accessToken = null;
          }
        }

        // ── Slow path: attempt token refresh via cookie ────────
        try {
          const { data: refreshData } = await authApi.refresh();
          if (typeof window !== 'undefined') window.__accessToken = refreshData.accessToken;
          set({ accessToken: refreshData.accessToken });

          const { data: meData } = await authApi.me();
          set({ user: meData.user, isAuthenticated: true, isLoading: false });
          connectSocket(refreshData.accessToken);
        } catch {
          // Refresh failed — user must log in again
          if (typeof window !== 'undefined') window.__accessToken = null;
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      login: async (credentials) => {
        const { data } = await authApi.login(credentials);
        if (typeof window !== 'undefined') window.__accessToken = data.accessToken;
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
        connectSocket(data.accessToken);
        return data;
      },

      register: async (payload) => {
        const { data } = await authApi.register(payload);
        if (typeof window !== 'undefined') window.__accessToken = data.accessToken;
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
        connectSocket(data.accessToken);
        return data;
      },

      logout: async () => {
        try { await authApi.logout(); } catch (_) {}
        disconnectSocket();
        if (typeof window !== 'undefined') window.__accessToken = null;
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth',
      // Only persist the accessToken — user profile is re-fetched from server
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
);