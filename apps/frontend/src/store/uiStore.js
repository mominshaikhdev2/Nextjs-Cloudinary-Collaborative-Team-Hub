import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: false,
  notifications: [],
  unreadCount: 0,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setNotifications: (notifications) => set({ notifications }),
  addNotification: (n) =>
    set((s) => ({ notifications: [n, ...s.notifications], unreadCount: s.unreadCount + 1 })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
}));