import { create } from 'zustand';
import type { User } from '../types';

interface AuthStore {
    user: User | null;
    accessToken: string | null;
    agentStatuses: Record<string, 'idle' | 'running' | 'error'>;

    setAuth: (user: User, token: string) => void;
    clearAuth: () => void;
    setUser: (user: User) => void;
    setAgentStatus: (agentName: string, status: 'idle' | 'running' | 'error') => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    accessToken: null,
    agentStatuses: {
        scout: 'idle',
        analyzer: 'idle',
        writer: 'idle',
        apply: 'idle',
        tracker: 'idle',
    },

    setAuth: (user, token) => set({ user, accessToken: token }),
    clearAuth: () => set({ user: null, accessToken: null }),
    setUser: (user) => set({ user }),
    setAgentStatus: (agentName, status) =>
        set((state) => ({
            agentStatuses: { ...state.agentStatuses, [agentName]: status },
        })),
}));
