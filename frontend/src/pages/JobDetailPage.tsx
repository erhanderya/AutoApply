import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AgentFeed } from '../components/agents/AgentFeed';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { useAgentFeed } from '../hooks/useAgentFeed';
import { jobsService } from '../services/jobs.service';
import type { AgentRunStatus } from '../types';

function getRunBadge(status?: AgentRunStatus | null) {
    if (!status || status === 'idle') return <Badge variant="neutral">Idle</Badge>;
    if (status === 'completed') return <Badge variant="success">Completed</Badge>;
    if (status === 'running' || status === 'queued') return <Badge variant="warning">{status}</Badge>;
    return <Badge variant="danger">Failed</Badge>;
}

function getFitBadge(score?: number | null) {
    if (score === undefined || score === null) return <Badge variant="neutral">Not analyzed</Badge>;
    if (score >= 75) return <Badge variant="success">{score}% fit</Badge>;
    if (score >= 50) return <Badge variant="warning">{score}% fit</Badge>;
    return <Badge variant="danger">{score}% fit</Badge>;
}

function formatDateTime(value?: string | null) {
    if (!value) return 'Not provided';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

function formatText(value?: string | null) {
    if (!value) return 'Not provided';
    return value;
}

function formatSalary(value?: number | null) {
    if (value === undefined || value === null) return 'Not provided';

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatSalaryRange(min?: number | null, max?: number | null) {
    if ((min === undefined || min === null) && (max === undefined || max === null)) {
        return 'Not provided';
    }
    if (min !== undefined && min !== null && max !== undefined && max !== null) {
        return `${formatSalary(min)} - ${formatSalary(max)}`;
    }
    if (min !== undefined && min !== null) {
        return `${formatSalary(min)}+`;
    }
    return `Up to ${formatSalary(max)}`;
}

export function JobDetailPage() {
    const { jobId } = useParams();
    const queryClient = useQueryClient();
    const { logs: liveLogs } = useAgentFeed();

    const detailQuery = useQuery({
        queryKey: ['job-detail', jobId],
        queryFn: () => jobsService.getById(jobId as string),
        enabled: Boolean(jobId),
    });

    const analyzeMutation = useMutation({
        mutationFn: (selectedJobId: string) => jobsService.analyze([selectedJobId]),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['jobs'] });
            void queryClient.invalidateQueries({ queryKey: ['job-detail', jobId] });
        },
    });

    const mergedLogs = useMemo(() => {
        const serverLogs = detailQuery.data?.agentLogs || [];
        const applicationId = detailQuery.data?.application?.id;
        const dedupe = new Set(serverLogs.map((log) => `${log.agentName}-${log.action}-${log.timestamp}`));
        const filteredLive = liveLogs.filter((log) => {
            if (applicationId) {
                return log.applicationId === applicationId;
            }
            return log.jobId === jobId;
        });
        const liveOnly = filteredLive.filter((log) => {
            const key = `${log.agentName}-${log.action}-${log.timestamp}`;
            if (dedupe.has(key)) {
                return false;
            }
            dedupe.add(key);
            return true;
        });
        return [...liveOnly, ...serverLogs].slice(0, 20);
    }, [detailQuery.data?.agentLogs, detailQuery.data?.application?.id, jobId, liveLogs]);

    if (detailQuery.isLoading) {
        return (
            <PageWrapper>
                <Spinner className="py-20" size="lg" />
            </PageWrapper>
        );
    }

    if (detailQuery.isError || !detailQuery.data) {
        return (
            <PageWrapper>
                <EmptyState
                    icon={'\u26A0\uFE0F'}
                    title="Job detail unavailable"
                    description="We could not load this job right now."
                />
            </PageWrapper>
        );
    }

    const { job, application, analysis, cvReady } = detailQuery.data;
    const activeAnalysis = application?.analysisPayload || analysis;
    const metadataRows = [
        { label: 'Job ID', value: formatText(job.id) },
        { label: 'Application ID', value: formatText(job.applicationId) },
        { label: 'Work Type', value: formatText(job.workType) },
        { label: 'Source', value: formatText(job.source) },
        { label: 'Apply Type', value: formatText(job.applyType) },
        { label: 'Salary Range', value: formatSalaryRange(job.salaryMin, job.salaryMax) },
        { label: 'Scraped At', value: formatDateTime(job.scrapedAt) },
        {
            label: 'Apply URL',
            value: job.applyUrl ? (
                <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-indigo hover:text-indigo-dark"
                >
                    {job.applyUrl}
                </a>
            ) : (
                'Not provided'
            ),
        },
        { label: 'Analysis Status', value: formatText(job.analysisStatus) },
        { label: 'Writer Status', value: formatText(job.writerStatus) },
        {
            label: 'Fit Score',
            value: job.fitScore === undefined || job.fitScore === null ? 'Not analyzed' : `${job.fitScore}%`,
        },
    ];

    return (
        <PageWrapper>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <Link to="/dashboard" className="text-sm text-indigo hover:text-indigo-dark">
                        Back to Dashboard
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold text-navy">{job.title}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {job.company} · {job.location}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {getFitBadge(job.fitScore)}
                    {getRunBadge(job.analysisStatus)}
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => void analyzeMutation.mutateAsync(job.id)}
                        loading={analyzeMutation.isPending}
                        disabled={!cvReady}
                    >
                        Analyze
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(job.applyUrl, '_blank', 'noopener,noreferrer')}
                    >
                        Open Apply Page
                    </Button>
                </div>
            </div>

            {!cvReady && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Upload your CV from the profile page before running the analyzer.
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                        <div>
                            <h2 className="text-lg font-semibold text-navy">Job Details</h2>
                            <p className="text-sm text-gray-500">Priority fields are highlighted up top, with the rest of the metadata kept in a simple list below.</p>
                        </div>
                        <Badge variant="info">{job.source === 'remoteok' ? 'RemoteOK' : 'Adzuna'}</Badge>
                    </div>

                    <div className="space-y-6 p-5">
                        <div className="rounded-2xl border border-indigo/15 bg-gradient-to-r from-indigo/5 via-white to-teal/5 px-5 py-5">
                            <p className="text-xs uppercase tracking-wide text-indigo-dark">Role Snapshot</p>
                            <h3 className="mt-2 text-2xl font-bold leading-tight text-navy">{job.title || 'Untitled role'}</h3>
                            <p className="mt-2 text-sm text-gray-600">{job.company || 'Unknown company'} · {job.location || 'Location not provided'}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {getFitBadge(job.fitScore)}
                                {getRunBadge(job.analysisStatus)}
                                <Badge variant="neutral">{formatText(job.workType)}</Badge>
                                <Badge variant="neutral">{formatSalaryRange(job.salaryMin, job.salaryMax)}</Badge>
                            </div>
                        </div>

                        <div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-navy">Description</h3>
                                    <p className="text-sm text-gray-500">Quickly review the role's main responsibilities and scope.</p>
                                </div>
                                {job.applyUrl && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => window.open(job.applyUrl, '_blank', 'noopener,noreferrer')}
                                    >
                                        Open application page
                                    </Button>
                                )}
                            </div>
                            <pre className="mt-4 whitespace-pre-wrap border-l-4 border-indigo bg-white/70 pl-4 text-sm leading-7 text-gray-700 font-sans">
                                {job.description || 'No description provided.'}
                            </pre>
                        </div>

                        <div>
                            <h3 className="text-base font-semibold text-navy">Job Metadata</h3>
                            <dl className="mt-3 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
                                {metadataRows.map((row) => (
                                    <div key={row.label} className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_1fr] sm:items-start">
                                        <dt className="text-xs uppercase tracking-wide text-gray-400">{row.label}</dt>
                                        <dd className="text-sm text-gray-700">{row.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-navy">Analyze</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Manual analyze keeps token usage focused on the jobs you explicitly choose.
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-gray-400">Fit Score</p>
                                <div className="mt-2">{getFitBadge(application?.fitScore ?? job.fitScore)}</div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-gray-400">Writer</p>
                                <div className="mt-2">{getRunBadge(application?.writerStatus ?? job.writerStatus)}</div>
                            </div>
                        </div>

                        {activeAnalysis ? (
                            <div className="mt-5 space-y-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-400">Rationale</p>
                                    <p className="mt-1 text-sm text-gray-700">{activeAnalysis.rationale || 'No rationale available yet.'}</p>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
                                        <p className="text-sm font-semibold text-green-800">Matched Skills</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {activeAnalysis.matched_skills.length ? activeAnalysis.matched_skills.map((skill) => (
                                                <Badge key={skill} variant="success">{skill}</Badge>
                                            )) : <span className="text-sm text-green-900/70">No matches captured yet.</span>}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                                        <p className="text-sm font-semibold text-amber-800">Missing Skills</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {activeAnalysis.missing_skills.length ? activeAnalysis.missing_skills.map((skill) => (
                                                <Badge key={skill} variant="warning">{skill}</Badge>
                                            )) : <span className="text-sm text-amber-900/70">No major gaps detected.</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                    <p className="text-sm font-semibold text-navy">CV Advice</p>
                                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                                        {activeAnalysis.cv_advice.length ? activeAnalysis.cv_advice.map((tip) => (
                                            <li key={tip} className="flex gap-2">
                                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo" />
                                                <span>{tip}</span>
                                            </li>
                                        )) : (
                                            <li>No CV suggestions yet.</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                Run Analyze to generate a fit score, skill gap analysis, and job-specific CV suggestions.
                            </div>
                        )}
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-navy">Writer Output</h2>
                        <div className="mt-4 space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400">CV Summary</p>
                                <p className="mt-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    {application?.cvVariantText || 'Writer output will appear here when the fit score reaches the threshold.'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400">Cover Letter</p>
                                <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 font-sans">
                                    {application?.coverLetterText || 'No cover letter generated yet.'}
                                </pre>
                            </div>
                        </div>
                    </div>

                    <AgentFeed logs={mergedLogs} />
                </section>
            </div>
        </PageWrapper>
    );
}
