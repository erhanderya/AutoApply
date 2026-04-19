import axios from 'axios';
import api from '../lib/axios';
import type { InterviewPrep, InterviewPrepStatus, CompanyResearch, InterviewQuestion, StarAnswer } from '../types';
import { mockInterviewPrep } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

interface RawPrep {
    id: string;
    applicationId: string;
    status: InterviewPrepStatus;
    companyResearch: CompanyResearch | null;
    questions: InterviewQuestion[];
    answers: StarAnswer[];
    errorMessage: string | null;
    createdAt: string;
    lastUpdatedAt: string;
}

function mapPrep(raw: RawPrep): InterviewPrep {
    return {
        id: raw.id,
        applicationId: raw.applicationId,
        status: raw.status,
        companyResearch: raw.companyResearch,
        questions: raw.questions || [],
        answers: raw.answers || [],
        errorMessage: raw.errorMessage,
        createdAt: raw.createdAt,
        lastUpdatedAt: raw.lastUpdatedAt,
    };
}

export const interviewPrepService = {
    async getByApplicationId(id: string): Promise<InterviewPrep | null> {
        if (isMock) return mockInterviewPrep(id);
        try {
            const res = await api.get<RawPrep>(`/api/applications/${id}/interview-prep`);
            return mapPrep(res.data);
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 404) {
                return null;
            }
            throw e;
        }
    },

    async regenerate(id: string): Promise<InterviewPrep> {
        if (isMock) {
            // Fake a delay for mock
            return new Promise((resolve) => {
                setTimeout(() => resolve(mockInterviewPrep(id)), 1000);
            });
        }
        const res = await api.post<RawPrep>(`/api/applications/${id}/interview-prep/regenerate`);
        return mapPrep(res.data);
    },
};
