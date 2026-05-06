import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,    
      isLoading: true,
      isAuthenticated: false,

      initialize: async () => {
        set({ isLoading: true });
        const { accessToken, refreshToken } = get();

        if (accessToken && typeof window !== 'undefined') {
          window.__accessToken = accessToken;
        }

        
        if (accessToken) {
          try {
            const { data } = await authApi.me();
            set({ user: data.user, isAuthenticated: true, isLoading: false });
            connectSocket(accessToken);
            return;
          } catch (err) {
            if (err?.response?.status !== 401) {
              
              set({ isLoading: false });
              return;
            }
            
            if (typeof window !== 'undefined') window.__accessToken = null;
          }
        }

        
        if (!refreshToken) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        try {
          const { data } = await authApi.refresh(refreshToken);
          if (typeof window !== 'undefined') window.__accessToken = data.accessToken;
          set({ accessToken: data.accessToken, refreshToken: data.refreshToken || refreshToken });

          const { data: meData } = await authApi.me();
          set({ user: meData.user, isAuthenticated: true, isLoading: false });
          connectSocket(data.accessToken);
        } catch {
          if (typeof window !== 'undefined') window.__accessToken = null;
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (credentials) => {
        const { data } = await authApi.login(credentials);
        if (typeof window !== 'undefined') window.__accessToken = data.accessToken;
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || null,
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
          refreshToken: data.refreshToken || null,
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
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
    }),
    {
      name: 'auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,   
      }),
    }
  )
);
