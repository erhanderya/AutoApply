import api from '../lib/axios';
import type { ScoutTaskStatus, ScoutTriggerResponse } from '../types';


const isMock = import.meta.env.VITE_USE_MOCK === 'true';


export const scoutService = {
    async trigger(): Promise<ScoutTriggerResponse> {
        if (isMock) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return {
                taskId: 'mock-scout-task',
                status: 'queued',
            };
        }

        const res = await api.post<ScoutTriggerResponse>('/api/scout/trigger');
        return res.data;
    },

    async getStatus(taskId: string): Promise<ScoutTaskStatus> {
        if (isMock) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            return {
                taskId,
                state: 'SUCCESS',
                result: '{"new_jobs":3}',
            };
        }

        const res = await api.get<ScoutTaskStatus>(`/api/scout/status/${taskId}`);
        return res.data;
    },
};
