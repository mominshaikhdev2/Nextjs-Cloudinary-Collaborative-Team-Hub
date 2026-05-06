import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 second timeout
});

// Attach access token
api.interceptors.request.use((config) =>
{
  if (typeof window !== 'undefined' && window.__accessToken)
  {
    config.headers.Authorization = `Bearer ${window.__accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (res) => res,
  async (err) =>
  {
    const original = err.config;

    if (err.response?.status === 503)
    {
      return Promise.reject(err);
    }

    const isExpired =
      err.response?.status === 401 &&
      (err.response?.data?.code === 'TOKEN_EXPIRED' ||
        err.response?.data?.error === 'Token expired');

    const isRefreshEndpoint = original?.url?.includes('/auth/refresh');

    if (isExpired && !original._retry && !isRefreshEndpoint)
    {
      if (isRefreshing)
      {
        return new Promise((resolve, reject) =>
        {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) =>
        {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try
      {
        const storedToken = (() =>
        {
          try
          {
            const raw = localStorage.getItem('auth');
            return JSON.parse(raw)?.state?.refreshToken || null;
          } catch { return null; }
        })();

        const { data } = await api.post('/api/auth/refresh', storedToken ? { refreshToken: storedToken } : {});
        const newToken = data.accessToken;

        if (typeof window !== 'undefined') window.__accessToken = newToken;

        try
        {
          const { useAuthStore } = await import('@/store/authStore');
          useAuthStore.setState({
            accessToken: newToken,
            refreshToken: data.refreshToken || storedToken,
          });
        } catch (_) { }

        refreshQueue.forEach((q) => q.resolve(newToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr)
      {
        refreshQueue.forEach((q) => q.reject(refreshErr));
        refreshQueue = [];

        if (typeof window !== 'undefined') window.__accessToken = null;

        try
        {
          const { useAuthStore } = await import('@/store/authStore');
          useAuthStore.setState({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        } catch (_) { }

        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally
      {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  refresh: (refreshToken) =>
    api.post('/api/auth/refresh', refreshToken ? { refreshToken } : {}),
  me: () => api.get('/api/auth/me'),
};

export const userApi = {
  updateProfile: (data) => api.patch('/api/users/profile', data),
  uploadAvatar: (formData) =>
    api.post('/api/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changePassword: (data) => api.patch('/api/users/password', data),
};

export const workspaceApi = {
  list: () => api.get('/api/workspaces'),
  create: (data) => api.post('/api/workspaces', data),
  get: (id) => api.get(`/api/workspaces/${id}`),
  update: (id, data) => api.patch(`/api/workspaces/${id}`, data),
  delete: (id) => api.delete(`/api/workspaces/${id}`),
  getMembers: (id) => api.get(`/api/workspaces/${id}/members`),
  invite: (id, data) => api.post(`/api/workspaces/${id}/invite`, data),
  updateMemberRole: (id, userId, data) =>
    api.patch(`/api/workspaces/${id}/members/${userId}/role`, data),
  removeMember: (id, userId) =>
    api.delete(`/api/workspaces/${id}/members/${userId}`),
  leave: (id) => api.post(`/api/workspaces/${id}/leave`),
};

export const goalApi = {
  list: (workspaceId, params) =>
    api.get(`/api/workspaces/${workspaceId}/goals`, { params }),
  create: (workspaceId, data) =>
    api.post(`/api/workspaces/${workspaceId}/goals`, data),
  get: (workspaceId, goalId) =>
    api.get(`/api/workspaces/${workspaceId}/goals/${goalId}`),
  update: (workspaceId, goalId, data) =>
    api.patch(`/api/workspaces/${workspaceId}/goals/${goalId}`, data),
  delete: (workspaceId, goalId) =>
    api.delete(`/api/workspaces/${workspaceId}/goals/${goalId}`),
  getUpdates: (workspaceId, goalId, params) =>
    api.get(`/api/workspaces/${workspaceId}/goals/${goalId}/updates`, { params }),
  addUpdate: (workspaceId, goalId, data) =>
    api.post(`/api/workspaces/${workspaceId}/goals/${goalId}/updates`, data),
};

export const milestoneApi = {
  list: (workspaceId, goalId) =>
    api.get(`/api/workspaces/${workspaceId}/goals/${goalId}/milestones`),
  create: (workspaceId, goalId, data) =>
    api.post(`/api/workspaces/${workspaceId}/goals/${goalId}/milestones`, data),
  update: (workspaceId, goalId, milestoneId, data) =>
    api.patch(
      `/api/workspaces/${workspaceId}/goals/${goalId}/milestones/${milestoneId}`,
      data
    ),
  delete: (workspaceId, goalId, milestoneId) =>
    api.delete(
      `/api/workspaces/${workspaceId}/goals/${goalId}/milestones/${milestoneId}`
    ),
};

export const announcementApi = {
  list: (workspaceId, params) =>
    api.get(`/api/workspaces/${workspaceId}/announcements`, { params }),
  create: (workspaceId, data) =>
    api.post(`/api/workspaces/${workspaceId}/announcements`, data),
  update: (workspaceId, id, data) =>
    api.patch(`/api/workspaces/${workspaceId}/announcements/${id}`, data),
  delete: (workspaceId, id) =>
    api.delete(`/api/workspaces/${workspaceId}/announcements/${id}`),
  togglePin: (workspaceId, id) =>
    api.patch(`/api/workspaces/${workspaceId}/announcements/${id}/pin`),
  addReaction: (workspaceId, id, data) =>
    api.post(`/api/workspaces/${workspaceId}/announcements/${id}/reactions`, data),
  getComments: (workspaceId, id) =>
    api.get(`/api/workspaces/${workspaceId}/announcements/${id}/comments`),
  addComment: (workspaceId, id, data) =>
    api.post(
      `/api/workspaces/${workspaceId}/announcements/${id}/comments`,
      data
    ),
  deleteComment: (workspaceId, id, commentId) =>
    api.delete(
      `/api/workspaces/${workspaceId}/announcements/${id}/comments/${commentId}`
    ),
};

export const actionItemApi = {
  list: (workspaceId, params) =>
    api.get(`/api/workspaces/${workspaceId}/action-items`, { params }),
  create: (workspaceId, data) =>
    api.post(`/api/workspaces/${workspaceId}/action-items`, data),
  update: (workspaceId, id, data) =>
    api.patch(`/api/workspaces/${workspaceId}/action-items/${id}`, data),
  delete: (workspaceId, id) =>
    api.delete(`/api/workspaces/${workspaceId}/action-items/${id}`),
  reorder: (workspaceId, data) =>
    api.patch(`/api/workspaces/${workspaceId}/action-items/reorder`, data),
};

export const analyticsApi = {
  stats: (workspaceId) =>
    api.get(`/api/workspaces/${workspaceId}/analytics/stats`),
  goalChart: (workspaceId, params) =>
    api.get(`/api/workspaces/${workspaceId}/analytics/goal-chart`, { params }),
  export: (workspaceId) =>
    api.get(`/api/workspaces/${workspaceId}/analytics/export`, {
      responseType: 'blob',
    }),
  activity: (workspaceId, params) =>
    api.get(`/api/workspaces/${workspaceId}/analytics/activity`, { params }),
};

export const notificationApi = {
  list: (params) => api.get('/api/notifications', { params }),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
  delete: (id) => api.delete(`/api/notifications/${id}`),
};