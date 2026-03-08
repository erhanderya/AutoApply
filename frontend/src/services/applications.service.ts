import api from '../lib/axios';
import type { Application, ApplicationStatus } from '../types';
import { mockApplications } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export const applicationsService = {
    async getAll(): Promise<Application[]> {
        if (isMock) return mockApplications;
        const res = await api.get<Application[]>('/api/applications');
        return res.data;
    },

    async getById(id: string): Promise<Application> {
        if (isMock) {
            const app = mockApplications.find((a) => a.id === id);
            if (!app) throw new Error('Application not found');
            return app;
        }
        const res = await api.get<Application>(`/api/applications/${id}`);
        return res.data;
    },

    async approve(id: string): Promise<Application> {
        if (isMock) {
            const app = mockApplications.find((a) => a.id === id);
            if (!app) throw new Error('Application not found');
            return { ...app, status: 'applied' };
        }
        const res = await api.post<Application>(`/api/applications/${id}/approve`);
        return res.data;
    },

    async updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
        if (isMock) {
            const app = mockApplications.find((a) => a.id === id);
            if (!app) throw new Error('Application not found');
            return { ...app, status };
        }
        const res = await api.patch<Application>(`/api/applications/${id}/status`, { status });
        return res.data;
    },

    async updateCoverLetter(id: string, text: string): Promise<Application> {
        if (isMock) {
            const app = mockApplications.find((a) => a.id === id);
            if (!app) throw new Error('Application not found');
            return { ...app, coverLetterText: text };
        }
        const res = await api.patch<Application>(`/api/applications/${id}/cover-letter`, { text });
        return res.data;
    },
};
