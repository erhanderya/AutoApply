import api from '../lib/axios';
import type { CVData } from '../types';
import { mockCV } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export const cvService = {
    async upload(file: File): Promise<{ parsed: CVData }> {
        if (isMock) {
            // Simulate upload delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return { parsed: mockCV };
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<{ parsed: CVData }>('/api/cv/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    async getCV(): Promise<CVData> {
        if (isMock) return mockCV;
        const res = await api.get<CVData>('/api/cv');
        return res.data;
    },
};
