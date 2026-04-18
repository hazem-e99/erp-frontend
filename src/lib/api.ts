import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Global response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;

    if (status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Show toast for server errors (5xx) — 4xx are handled per-form
    if (!status) {
      toast.error('Cannot connect to the server. Please check your connection.', { duration: 6000 });
    } else if (status >= 500) {
      toast.error('A server error occurred. Please try again.', { duration: 6000 });
    }

    return Promise.reject(error);
  },
);

export default api;
