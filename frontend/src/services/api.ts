import axios from 'axios';
import type { User, Task, ResumeResult } from '../types';

// ── Axios Instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: auto-attach Bearer token ───────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('resuflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor: normalize errors ──────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message =
        data?.detail ??
        data?.message ??
        (typeof data === 'string' ? data : `Request failed (${status})`);
      return Promise.reject(new ApiError(message, status));
    }
    return Promise.reject(new ApiError('Network error — is the backend running?', 0));
  }
);

// ── Custom Error Class ──────────────────────────────────────
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ── Auth API ────────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async register(email: string, password: string): Promise<User> {
    const { data } = await api.post('/auth/register', { email, password });
    return data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get('/users/me');
    return data;
  },
};

// ── Resume API ──────────────────────────────────────────────
export const resumeApi = {
  async upload(file: File): Promise<Task> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async listTasks(): Promise<Task[]> {
    const { data } = await api.get('/resumes/tasks');
    return data;
  },

  async getTask(taskId: string): Promise<Task> {
    const { data } = await api.get(`/resumes/tasks/${taskId}`);
    return data;
  },

  async getResult(taskId: string): Promise<ResumeResult> {
    const { data } = await api.get(`/resumes/tasks/${taskId}/result`);
    return data;
  },
};

export default api;
