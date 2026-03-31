import api from '../lib/axios';
import type { AnalyzeJobsResponse, JobDetailResponse, JobFilters, JobsResponse } from '../types';
import { mockAgentLogs, mockApplications, mockJobs } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export const jobsService = {
    async getJobs(filters?: JobFilters): Promise<JobsResponse> {
        if (isMock) {
            let filtered = [...mockJobs];

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

            return {
                jobs: filtered,
                total: filtered.length,
                page: filters?.page || 1,
            };
        }

        const res = await api.get<JobsResponse>('/api/jobs', { params: filters });
        return res.data;
    },

    async getById(id: string): Promise<JobDetailResponse> {
        if (isMock) {
            const job = mockJobs.find((item) => item.id === id);
            if (!job) throw new Error('Job not found');
            const application = mockApplications.find((item) => item.jobId === id) || null;
            return {
                job,
                application,
                analysis: application?.analysisPayload || null,
                agentLogs: mockAgentLogs.filter((log) => log.jobId === id),
                cvReady: true,
            };
        }

        const res = await api.get<JobDetailResponse>(`/api/jobs/${id}`);
        return res.data;
    },

    async analyze(jobIds: string[]): Promise<AnalyzeJobsResponse> {
        if (isMock) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return {
                taskId: 'mock-analysis-task',
                status: 'queued',
                acceptedJobIds: jobIds,
            };
        }

        const res = await api.post<AnalyzeJobsResponse>('/api/jobs/analyze', { jobIds });
        return res.data;
    },
};
