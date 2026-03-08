import api from '../lib/axios';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types';
import { mockUser } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export const authService = {
    async login(data: LoginRequest): Promise<AuthResponse> {
        if (isMock) {
            return {
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
                user: mockUser,
            };
        }
        const res = await api.post<AuthResponse>('/api/auth/login', data);
        return res.data;
    },

    async register(data: RegisterRequest): Promise<AuthResponse> {
        if (isMock) {
            return {
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
                user: { ...mockUser, cvParsed: false, preferences: undefined },
            };
        }
        const res = await api.post<AuthResponse>('/api/auth/register', data);
        return res.data;
    },

    async getMe(): Promise<User> {
        if (isMock) return mockUser;
        const res = await api.get<User>('/api/auth/me');
        return res.data;
    },

    async refresh(): Promise<{ access_token: string }> {
        const res = await api.post<{ access_token: string }>('/api/auth/refresh', {}, { withCredentials: true });
        return res.data;
    },
};
