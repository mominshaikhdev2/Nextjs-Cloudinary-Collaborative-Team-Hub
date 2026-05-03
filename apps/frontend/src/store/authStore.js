import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';
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

      initialize: async () => {
        const { accessToken } = get();
        if (accessToken && typeof window !== 'undefined') {
          window.__accessToken = accessToken;
        }
        try {
          // Try to refresh
          const { data } = await authApi.refresh();
          if (typeof window !== 'undefined') window.__accessToken = data.accessToken;
          set({ accessToken: data.accessToken });

          const { data: meData } = await authApi.me();
          set({ user: meData.user, isAuthenticated: true, isLoading: false });

          connectSocket(data.accessToken);
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false, accessToken: null });
          if (typeof window !== 'undefined') window.__accessToken = null;
        }
      },

      login: async (credentials) => {
        const { data } = await authApi.login(credentials);
        if (typeof window !== 'undefined') window.__accessToken = data.accessToken;
        set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
        connectSocket(data.accessToken);
        return data;
      },

      register: async (payload) => {
        const { data } = await authApi.register(payload);
        if (typeof window !== 'undefined') window.__accessToken = data.accessToken;
        set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
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
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
    }),
    {
      name: 'auth',
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
);