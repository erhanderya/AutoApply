import api from '../lib/axios';
import type { JobsResponse, JobFilters } from '../types';
import { mockJobs } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export const jobsService = {
    async getJobs(filters?: JobFilters): Promise<JobsResponse> {
        if (isMock) {
            let filtered = [...mockJobs];
            const page = filters?.page || 1;
            const limit = filters?.limit || 20;

            if (filters?.workType && filters.workType !== 'any') {
                filtered = filtered.filter((j) => j.workType === filters.workType);
            }
            if (filters?.search) {
                const search = filters.search.toLowerCase();
                filtered = filtered.filter(
                    (j) =>
                        j.title.toLowerCase().includes(search) ||
                        j.company.toLowerCase().includes(search)
                );
            }

            const start = (page - 1) * limit;
            const paginatedJobs = filtered.slice(start, start + limit);

            return {
                jobs: paginatedJobs,
                total: filtered.length,
                page,
            };
        }

        const res = await api.get<JobsResponse>('/api/jobs', { params: filters });
        return res.data;
    },
};
