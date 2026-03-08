import api from '../lib/axios';
import type { Preferences } from '../types';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export const preferencesService = {
    async update(data: Preferences): Promise<Preferences> {
        if (isMock) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return data;
        }
        const res = await api.put<Preferences>('/api/preferences', data);
        return res.data;
    },
};
