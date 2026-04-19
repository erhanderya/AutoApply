export interface User {
    id: string;
    email: string;
    preferences?: Preferences;
    cvParsed: boolean;
}

export type WorkTypePreference = 'remote' | 'hybrid' | 'onsite';
export type AgentRunStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';
export type ApplicationStatus = 'pending' | 'applied' | 'in_review' | 'interview' | 'offer' | 'rejected';

export interface Preferences {
    targetRoles: string[];
    location?: string;
    salaryExpectation?: number;
    workType?: WorkTypePreference;
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
    user: User;
}

export interface JobAnalysisPayload {
    job_id: string;
    fit_score: number;
    matched_skills: string[];
    missing_skills: string[];
    cv_advice: string[];
    recommendation: 'apply' | 'skip';
    rationale: string;
}

export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    workType: WorkTypePreference;
    source: 'remoteok' | 'adzuna';
    applyType: 'email' | 'platform';
    applyUrl: string;
    description: string;
    scrapedAt: string;
    fitScore?: number | null;
    analysisStatus?: AgentRunStatus | null;
    writerStatus?: AgentRunStatus | null;
    applicationId?: string | null;
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

export interface Application {
    id: string;
    jobId: string;
    job: Job;
    status: ApplicationStatus;
    fitScore: number;
    analysisPayload?: JobAnalysisPayload | null;
    analysisStatus: AgentRunStatus;
    writerStatus: AgentRunStatus;
    cvVariantText?: string | null;
    coverLetterText?: string | null;
    submittedAt: string;
    lastUpdatedAt: string;
    followUpScheduledAt?: string | null;
    agentLogs?: AgentLogEntry[];
}

export type AgentName = 'scout' | 'analyzer' | 'writer' | 'apply' | 'tracker' | 'interview_coach';

export interface CompanyResearch {
    company_summary: string;
    culture_keywords: string[];
    products_or_services: string[];
    recent_news: string[];
    sources: string[];
}

export interface InterviewQuestion {
    id: number;
    category: 'behavioral' | 'technical' | 'culture_fit' | 'role_specific';
    question: string;
    focus: string;
}

export interface StarAnswer {
    question_id: number;
    situation: string;
    task: string;
    action: string;
    result: string;
    talking_points: string[];
}

export type InterviewPrepStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

export interface InterviewPrep {
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

export interface AgentLogEntry {
    id: string;
    applicationId?: string;
    jobId?: string;
    agentName: AgentName;
    action: string;
    timestamp: string;
}

export interface AnalyticsSummary {
    totalApplications: number;
    responseRate: number;
    avgFitScore: number;
    interviewsScheduled: number;
    applicationsByStatus: Record<ApplicationStatus, number>;
    applicationsPerDay: { date: string; count: number }[];
    fitScoreDistribution: { range: string; count: number }[];
}

export interface WSEvent {
    type: 'agent_action' | 'application_update' | 'agent_status';
    payload: AgentActionPayload | ApplicationUpdatePayload | AgentStatusPayload;
}

export interface AgentActionPayload {
    agentName: AgentName;
    action: string;
    applicationId?: string;
    jobId?: string;
    timestamp: string;
}

export interface ApplicationUpdatePayload {
    applicationId: string;
    jobId?: string;
    newStatus: ApplicationStatus;
    message?: string;
}

export interface AgentStatusPayload {
    agentName: string;
    status: 'idle' | 'running' | 'error' | 'queued' | 'completed' | 'failed';
}

export interface ScoutTriggerResponse {
    taskId: string;
    status: string;
}

export interface ScoutTaskStatus {
    taskId: string;
    state: string;
    result: string | null;
}

export interface AnalyzeJobsResponse {
    taskId: string;
    status: string;
    acceptedJobIds: string[];
}

export interface JobDetailResponse {
    job: Job;
    application: Application | null;
    analysis: JobAnalysisPayload | null;
    agentLogs: AgentLogEntry[];
    cvReady: boolean;
}

export interface CVData {
    name: string;
    email: string;
    phone?: string;
    summary?: string;
    skills: string[];
    languages?: string[];
    experience: { title: string; company: string; duration: string; description?: string }[];
    education: { degree: string; school: string; year: string }[];
}
