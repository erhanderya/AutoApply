import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: attach access token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: clear invalid sessions
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().clearAuth();

            const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
            if (!isAuthPage) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
