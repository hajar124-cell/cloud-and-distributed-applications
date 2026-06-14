import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken } = res.data.data;
          setAccessToken(accessToken);
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          logout();
          window.location.href = '/login';
        }
      } else {
        logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) => api.put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) => api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Planning
export const planningApi = {
  getToday: (date?: string) => api.get('/planning/today', { params: date ? { date } : {} }),
  getWeek: (startDate?: string) => api.get('/planning/week', { params: startDate ? { startDate } : {} }),
  getByStudent: (studentId?: string, params?: { startDate?: string; endDate?: string }) => api.get(`/planning/student${studentId ? `/${studentId}` : ''}`, { params }),
  getByTeacher: (teacherId?: string, params?: { startDate?: string; endDate?: string }) => api.get(`/planning/teacher${teacherId ? `/${teacherId}` : ''}`, { params }),
  getSessionStudents: (id: string) => api.get(`/planning/${id}/students`),
  create: (data: Record<string, unknown>) => api.post('/planning', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/planning/${id}`, data),
  delete: (id: string) => api.delete(`/planning/${id}`),
  sendEmail: () => api.post('/planning/send-email'),
  exportCSV: (params?: Record<string, string>) => api.get('/planning/export/csv', { params, responseType: 'blob' }),
};

// Absences
export const absenceApi = {
  record: (sessionId: string, records: { studentId: string; status: string }[]) => api.post('/absences/record', { sessionId, records }),
  getByStudent: (studentId?: string, params?: { startDate?: string; endDate?: string }) => api.get(`/absences/student${studentId ? `/${studentId}` : ''}`, { params }),
  getByGroup: (groupId: string, params?: { startDate?: string; endDate?: string }) => api.get(`/absences/group/${groupId}`, { params }),
  getStats: (studentId?: string) => api.get(`/absences/stats${studentId ? `/${studentId}` : ''}`),
  justify: (id: string, justification: string) => api.patch(`/absences/${id}/justify`, { justification }),
  exportCSV: (params?: Record<string, string>) => api.get('/absences/export/csv', { params, responseType: 'blob' }),
};

// Payments
export const paymentApi = {
  getByStudent: (studentId?: string) => api.get(`/payments/student${studentId ? `/${studentId}` : ''}`),
  getAll: (params?: { page?: number; limit?: number; status?: string }) => api.get('/payments/all', { params }),
  getStats: () => api.get('/payments/stats'),
  getOverdue: () => api.get('/payments/overdue'),
  create: (data: Record<string, unknown>) => api.post('/payments', data),
  createPlan: (data: Record<string, unknown>) => api.post('/payments/plan', data),
  updateStatus: (id: string, status: string, method?: string, reference?: string) => api.patch(`/payments/${id}/status`, { status, method, reference }),
  sendReminders: () => api.post('/payments/reminders'),
  exportCSV: (params?: Record<string, string>) => api.get('/payments/export/csv', { params, responseType: 'blob' }),
};

// Progress
export const progressApi = {
  getByGroup: (groupId: string) => api.get(`/progress/group/${groupId}`),
  getByStudent: (studentId?: string) => api.get(`/progress/student${studentId ? `/${studentId}` : ''}`),
  getAll: () => api.get('/progress/all'),
  getByTeacher: (teacherId?: string) => api.get(`/progress/teacher${teacherId ? `/${teacherId}` : ''}`),
  update: (data: { moduleId: string; groupId: string; chaptersDone: number; notes?: string }) => api.post('/progress/update', data),
};

// Users
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; role?: string; search?: string }) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  updateRole: (id: string, role: string) => api.put(`/users/${id}/role`, { role }),
  resetPassword: (id: string, newPassword: string) => api.post(`/users/${id}/reset-password`, { newPassword }),
  getGroups: () => api.get('/users/groups'),
  createGroup: (data: Record<string, unknown>) => api.post('/users/groups', data),
  updateGroup: (id: string, data: Record<string, unknown>) => api.put(`/users/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/users/groups/${id}`),
  getRooms: () => api.get('/users/rooms'),
  createRoom: (data: Record<string, unknown>) => api.post('/users/rooms', data),
  updateRoom: (id: string, data: Record<string, unknown>) => api.put(`/users/rooms/${id}`, data),
  deleteRoom: (id: string) => api.delete(`/users/rooms/${id}`),
  getModules: () => api.get('/users/modules'),
  createModule: (data: Record<string, unknown>) => api.post('/users/modules', data),
  updateModule: (id: string, data: Record<string, unknown>) => api.put(`/users/modules/${id}`, data),
  deleteModule: (id: string) => api.delete(`/users/modules/${id}`),
  getLogs: (limit?: number) => api.get('/users/logs', { params: { limit } }),
};

// Notifications
export const notificationApi = {
  getAll: (limit?: number) => api.get('/notifications', { params: { limit } }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Emails
export const emailApi = {
  getLatest: (limit?: number) => api.get('/mail/latest', { params: { limit } }),
  send: (data: { to: string; subject: string; html?: string; text?: string }) => api.post('/mail/send', data),
  sync: () => api.post('/mail/sync'),
};

// OpenClaw
export const openclawApi = {
  getStatus: () => api.get('/openclaw/status'),
  triggerDailyPlanning: () => api.post('/openclaw/daily-planning', {}, { headers: { 'x-openclaw-secret': import.meta.env.VITE_OPENCLAW_SECRET } }),
  triggerPaymentReminders: () => api.post('/openclaw/payment-reminders', {}, { headers: { 'x-openclaw-secret': import.meta.env.VITE_OPENCLAW_SECRET } }),
};
