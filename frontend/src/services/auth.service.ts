import api from '../lib/axios';
import { normalizePreferences } from '../lib/preferences';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types';
import { mockUser } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

function normalizeUser(user: User): User {
    return {
        ...user,
        preferences: normalizePreferences(user.preferences),
    };
}

export const authService = {
    async login(data: LoginRequest): Promise<AuthResponse> {
        if (isMock) {
            return {
                access_token: 'mock-access-token',
                user: normalizeUser(mockUser),
            };
        }
        const res = await api.post<AuthResponse>('/api/auth/login', data);
        return {
            ...res.data,
            user: normalizeUser(res.data.user),
        };
    },

    async register(data: RegisterRequest): Promise<AuthResponse> {
        if (isMock) {
            return {
                access_token: 'mock-access-token',
                user: normalizeUser({ ...mockUser, cvParsed: false, preferences: undefined }),
            };
        }
        const res = await api.post<AuthResponse>('/api/auth/register', data);
        return {
            ...res.data,
            user: normalizeUser(res.data.user),
        };
    },

    async getMe(): Promise<User> {
        if (isMock) return normalizeUser(mockUser);
        const res = await api.get<User>('/api/auth/me');
        return normalizeUser(res.data);
    },
};
