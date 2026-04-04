import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAgentFeed } from '../hooks/useAgentFeed';
import { applicationsService } from '../services/applications.service';
import type { AgentRunStatus, Application } from '../types';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';

function getAnalysisBadge(status: AgentRunStatus) {
    if (status === 'completed') return <Badge variant="success">Completed</Badge>;
    if (status === 'running') return <Badge variant="warning">Running</Badge>;
    if (status === 'queued') return <Badge variant="info">Queued</Badge>;
    if (status === 'failed') return <Badge variant="danger">Failed</Badge>;
    return <Badge variant="neutral">Idle</Badge>;
}

function getRecommendationBadge(application: Application) {
    const recommendation = application.analysisPayload?.recommendation;
    if (recommendation === 'apply') return <Badge variant="success">Apply</Badge>;
    if (recommendation === 'skip') return <Badge variant="warning">Skip</Badge>;
    return <Badge variant="neutral">Pending</Badge>;
}

function formatDate(value?: string | null) {
    if (!value) return 'Unknown';

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

function hasAnalysisRecord(application: Application) {
    return application.analysisStatus !== 'idle' || application.analysisPayload !== null;
}

function sortByRecent(items: Application[]) {
    return [...items].sort((a, b) => {
        const aTime = new Date(a.lastUpdatedAt).getTime();
        const bTime = new Date(b.lastUpdatedAt).getTime();
        return bTime - aTime;
    });
}

function AnalysisJobCard({ application }: { application: Application }) {
    return (
        <article className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {getAnalysisBadge(application.analysisStatus)}
                        {getRecommendationBadge(application)}
                        {application.writerStatus !== 'idle' && (
                            <Badge variant={application.writerStatus === 'completed' ? 'success' : application.writerStatus === 'failed' ? 'danger' : 'info'}>
                                Writer {application.writerStatus}
                            </Badge>
                        )}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-navy">{application.job.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {application.job.company} · {application.job.location}
                    </p>
                </div>

                <Link
                    to={`/jobs/${application.jobId}`}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-indigo hover:text-indigo"
                >
                    Open Details
                </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Fit Score</p>
                    <p className="mt-2 text-sm font-semibold text-gray-700">
                        {application.analysisPayload ? `${application.analysisPayload.fit_score}%` : 'Waiting'}
                    </p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Updated</p>
                    <p className="mt-2 text-sm font-semibold text-gray-700">{formatDate(application.lastUpdatedAt)}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Application Status</p>
                    <p className="mt-2 text-sm font-semibold text-gray-700">{application.status}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Matched Skills</p>
                    <p className="mt-2 text-sm font-semibold text-gray-700">
                        {application.analysisPayload?.matched_skills.length || 0}
                    </p>
                </div>
            </div>

            {application.analysisPayload?.rationale && (
                <div className="mt-4 rounded-2xl border border-indigo/10 bg-indigo/5 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-indigo-dark">Rationale</p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">{application.analysisPayload.rationale}</p>
                </div>
            )}
        </article>
    );
}

export function AnalysisJobsPage() {
    useAgentFeed();

    const applicationsQuery = useQuery({
        queryKey: ['applications'],
        queryFn: () => applicationsService.getAll(),
        refetchInterval: 8000,
    });

    const analyzedApplications = useMemo(
        () => sortByRecent((applicationsQuery.data || []).filter(hasAnalysisRecord)),
        [applicationsQuery.data]
    );

    const activeApplications = analyzedApplications.filter(
        (application) => application.analysisStatus === 'queued' || application.analysisStatus === 'running'
    );
    const historyApplications = analyzedApplications.filter(
        (application) => application.analysisStatus === 'completed' || application.analysisStatus === 'failed'
    );

    if (applicationsQuery.isLoading) {
        return (
            <PageWrapper>
                <Spinner className="py-20" size="lg" />
            </PageWrapper>
        );
    }

    if (applicationsQuery.isError) {
        return (
            <PageWrapper>
                <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <EmptyState
                        icon={'\u26A0\uFE0F'}
                        title="Analysis jobs unavailable"
                        description="We could not load analysis records right now."
                    />
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-navy">Analysis Queue</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Gecmiste analiz edilen ve su anda analizde olan tum joblar burada listelenir.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Total Tracked</p>
                        <p className="mt-2 text-xl font-bold text-navy">{analyzedApplications.length}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-amber-700">In Progress</p>
                        <p className="mt-2 text-xl font-bold text-amber-900">{activeApplications.length}</p>
                    </div>
                    <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-green-700">Finished</p>
                        <p className="mt-2 text-xl font-bold text-green-900">{historyApplications.length}</p>
                    </div>
                </div>
            </div>

            {!analyzedApplications.length ? (
                <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
                    <EmptyState
                        icon={'\uD83E\uDDEA'}
                        title="No analyzed jobs yet"
                        description="Run Analyze on a job and it will start appearing here with live status updates."
                    />
                </div>
            ) : (
                <div className="space-y-6">
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-navy">Currently Running</h2>
                                <p className="text-sm text-gray-500">Queued ve running durumundaki analizler.</p>
                            </div>
                            <Badge variant="warning">{activeApplications.length}</Badge>
                        </div>

                        {activeApplications.length ? (
                            <div className="space-y-4">
                                {activeApplications.map((application) => (
                                    <AnalysisJobCard key={application.id} application={application} />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-sm text-gray-500">
                                There are no active analysis jobs right now.
                            </div>
                        )}
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-navy">Analysis History</h2>
                                <p className="text-sm text-gray-500">Tamamlanan veya hata alan onceki analizler.</p>
                            </div>
                            <Badge variant="info">{historyApplications.length}</Badge>
                        </div>

                        {historyApplications.length ? (
                            <div className="space-y-4">
                                {historyApplications.map((application) => (
                                    <AnalysisJobCard key={application.id} application={application} />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-sm text-gray-500">
                                Completed analysis records will appear here.
                            </div>
                        )}
                    </section>
                </div>
            )}
        </PageWrapper>
    );
}
