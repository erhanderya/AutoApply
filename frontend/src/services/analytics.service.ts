import api from '../lib/axios';
import type { AnalyticsSummary } from '../types';
import { mockAnalytics } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export const analyticsService = {
    async getSummary(): Promise<AnalyticsSummary> {
        if (isMock) return mockAnalytics;
        const res = await api.get<AnalyticsSummary>('/api/analytics/summary');
        return res.data;
    },
};
