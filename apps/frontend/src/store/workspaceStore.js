import { create } from 'zustand';
import { workspaceApi } from '@/lib/api';

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  currentRole: null,
  members: [],
  onlineUsers: [],
  isLoading: false,

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const { data } = await workspaceApi.list();
      set({ workspaces: data.workspaces, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setCurrentWorkspace: (workspace, role) =>
    set({ currentWorkspace: workspace, currentRole: role }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),

  updateWorkspace: (updated) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)),
      currentWorkspace:
        state.currentWorkspace?.id === updated.id
          ? { ...state.currentWorkspace, ...updated }
          : state.currentWorkspace,
    })),

  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      currentWorkspace: state.currentWorkspace?.id === id ? null : state.currentWorkspace,
    })),

  setMembers: (members) => set({ members }),

  removeMember: (userId) =>
    set((state) => ({ members: state.members.filter((m) => m.userId !== userId) })),
}));