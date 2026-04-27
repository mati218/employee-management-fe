import api from './api';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: { login: string; password: string; clientIp?: string }) =>
    api.post('/auth/login', data),

  verifyOtp: (data: { userId: string; otp: string }) =>
    api.post('/auth/verify-otp', data),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get('/auth/me'),
};

// ─── Invite ──────────────────────────────────────────────────────────────────

export const inviteApi = {
  validate: (token: string) => api.get(`/invite/validate/${token}`),

  register: (data: {
    token: string;
    username: string;
    password: string;
    fixedIp: string;
    telegramId: string;
  }) => api.post('/invite/register', data),
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => api.get('/admin/stats'),

  generateInvite: (data?: { expiryMinutes?: number; note?: string }) =>
    api.post('/admin/invite', data),

  listInvites: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/admin/invites', { params }),

  getPendingUsers: () => api.get('/admin/users/pending'),

  getAllUsers: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
    search?: string;
  }) => api.get('/admin/users', { params }),

  approveUser: (id: string) => api.patch(`/admin/users/${id}/approve`),

  rejectUser: (id: string, reason?: string) =>
    api.patch(`/admin/users/${id}/reject`, { reason }),

  updateUserIp: (id: string, fixedIp: string) =>
    api.patch(`/admin/users/${id}/ip`, { fixedIp }),

  suspendUser: (id: string) => api.patch(`/admin/users/${id}/suspend`),

  getLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/admin/logs', { params }),
};

// ─── User ────────────────────────────────────────────────────────────────────

export const userApi = {
  getProfile: () => api.get('/users/profile'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/users/change-password', data),
};
