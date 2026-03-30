import axios from 'axios';
import api from '../lib/axios';
import type { CVData } from '../types';
import { mockCV } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export interface CVUploadResult {
    parsed: CVData;
    parserMode?: string | null;
    parserModel?: string | null;
}

export const cvService = {
    async upload(file: File): Promise<CVUploadResult> {
        if (isMock) {
            // Simulate upload delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return { parsed: mockCV, parserMode: 'mock', parserModel: 'mock' };
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<CVUploadResult>('/api/cv/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    async getCV(): Promise<CVData | null> {
        if (isMock) return mockCV;
        try {
            const res = await api.get<CVData>('/api/cv');
            return res.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    async update(data: CVData): Promise<CVData> {
        if (isMock) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return data;
        }
        const res = await api.put<CVData>('/api/cv', data);
        return res.data;
    },
};
