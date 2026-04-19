import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthStore {
    user: User | null;
    accessToken: string | null;
    agentStatuses: Record<string, 'idle' | 'running' | 'error'>;
    authBootstrapped: boolean;

    setAuth: (user: User, token: string) => void;
    setAccessToken: (token: string | null) => void;
    clearAuth: () => void;
    setUser: (user: User) => void;
    setAuthBootstrapped: (value: boolean) => void;
    setAgentStatus: (agentName: string, status: 'idle' | 'running' | 'error') => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            authBootstrapped: false,
            agentStatuses: {
                scout: 'idle',
                analyzer: 'idle',
                writer: 'idle',
                interview_coach: 'idle',
            },

            setAuth: (user, token) => set({ user, accessToken: token }),
            setAccessToken: (token) => set({ accessToken: token }),
            clearAuth: () => set({ user: null, accessToken: null, authBootstrapped: true }),
            setUser: (user) => set({ user }),
            setAuthBootstrapped: (value) => set({ authBootstrapped: value }),
            setAgentStatus: (agentName, status) =>
                set((state) => ({
                    agentStatuses: { ...state.agentStatuses, [agentName]: status },
                })),
        }),
        {
            name: 'autoapply-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
            }),
        }
    )
);
