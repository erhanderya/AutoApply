// ─── User & Auth ───────────────────────────────────────────────

export interface User {
    id: string;
    email: string;
    preferences?: Preferences;
    cvParsed: boolean;
}

export interface Preferences {
    targetRole: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    workType: 'remote' | 'hybrid' | 'onsite' | 'any';
    autoApply: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: User;
}

// ─── Jobs ──────────────────────────────────────────────────────

export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    workType: 'remote' | 'hybrid' | 'onsite';
    source: 'remoteok' | 'adzuna';
    applyType: 'email' | 'platform';
    description: string;
    scrapedAt: string;
    fitScore?: number;
}

export interface JobsResponse {
    jobs: Job[];
    total: number;
    page: number;
}

export interface JobFilters {
    page?: number;
    limit?: number;
    workType?: string;
    search?: string;
}

// ─── Applications ──────────────────────────────────────────────

export type ApplicationStatus = 'applied' | 'in_review' | 'interview' | 'offer' | 'rejected';

export interface Application {
    id: string;
    jobId: string;
    job: Job;
    status: ApplicationStatus;
    fitScore: number;
    cvVariantPath?: string;
    coverLetterText?: string;
    submittedAt: string;
    lastUpdatedAt: string;
    followUpScheduledAt?: string;
}

// ─── Agents ────────────────────────────────────────────────────

export type AgentName = 'scout' | 'analyzer' | 'writer' | 'apply' | 'tracker';

export interface AgentLogEntry {
    id: string;
    applicationId?: string;
    agentName: AgentName;
    action: string;
    timestamp: string;
}

// ─── Analytics ─────────────────────────────────────────────────

export interface AnalyticsSummary {
    totalApplications: number;
    responseRate: number;
    avgFitScore: number;
    interviewsScheduled: number;
    applicationsByStatus: Record<ApplicationStatus, number>;
    applicationsPerDay: { date: string; count: number }[];
    fitScoreDistribution: { range: string; count: number }[];
}

// ─── WebSocket ─────────────────────────────────────────────────

export interface WSEvent {
    type: 'agent_action' | 'application_update' | 'agent_status';
    payload: AgentActionPayload | ApplicationUpdatePayload | AgentStatusPayload;
}

export interface AgentActionPayload {
    agentName: AgentName;
    action: string;
    applicationId?: string;
    timestamp: string;
}

export interface ApplicationUpdatePayload {
    applicationId: string;
    newStatus: ApplicationStatus;
    message?: string;
}

export interface AgentStatusPayload {
    agentName: string;
    status: 'idle' | 'running' | 'error';
}

// ─── CV ────────────────────────────────────────────────────────

export interface CVData {
    name: string;
    email: string;
    skills: string[];
    experience: { title: string; company: string; duration: string }[];
    education: { degree: string; school: string; year: string }[];
}
