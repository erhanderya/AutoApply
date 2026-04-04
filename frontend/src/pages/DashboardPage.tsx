import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { JobFilters } from '../components/jobs/JobFilters';
import { JobFeed } from '../components/jobs/JobFeed';
import { AgentStatusPanel } from '../components/agents/AgentStatusPanel';
import { AgentFeed } from '../components/agents/AgentFeed';
import { useAgentFeed } from '../hooks/useAgentFeed';
import { analyticsService } from '../services/analytics.service';
import { jobsService } from '../services/jobs.service';

const PAGE_SIZE = 6;

function sumRecentApplications(values: { date: string; count: number }[]) {
    return values.slice(-7).reduce((total, item) => total + item.count, 0);
}

export function DashboardPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [workType, setWorkType] = useState('any');
    const [page, setPage] = useState(1);
    const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
    const { logs } = useAgentFeed();

    useEffect(() => {
        setPage(1);
    }, [search, workType]);

    const jobsQuery = useQuery({
        queryKey: ['jobs', { search, workType, page, limit: PAGE_SIZE }],
        queryFn: () =>
            jobsService.getJobs({
                page,
                limit: PAGE_SIZE,
                search,
                workType: workType !== 'any' ? workType : undefined,
            }),
        placeholderData: (previousData) => previousData,
    });

    const analyticsQuery = useQuery({
        queryKey: ['analytics', 'summary'],
        queryFn: () => analyticsService.getSummary(),
        placeholderData: (previousData) => previousData,
    });

    const analyzeMutation = useMutation({
        mutationFn: (jobIds: string[]) => jobsService.analyze(jobIds),
        onSuccess: () => {
            setSelectedJobIds([]);
            void queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });

    const summary = analyticsQuery.data;
    const stats = [
        {
            label: 'Total Applications',
            value: summary?.totalApplications ?? '...',
            accent: 'from-indigo/15 via-indigo/5 to-white',
            iconBg: 'bg-indigo/10 text-indigo',
            helper: 'All tracked application records',
        },
        {
            label: 'This Week',
            value: summary ? sumRecentApplications(summary.applicationsPerDay) : '...',
            accent: 'from-teal/15 via-teal/5 to-white',
            iconBg: 'bg-teal/10 text-teal',
            helper: 'Applications updated in the last 7 days',
        },
        {
            label: 'Interviews',
            value: summary?.interviewsScheduled ?? '...',
            accent: 'from-green-100 via-green-50 to-white',
            iconBg: 'bg-green-100 text-green-700',
            helper: 'Interview-stage opportunities',
        },
        {
            label: 'Response Rate',
            value: summary ? `${summary.responseRate}%` : '...',
            accent: 'from-amber-100 via-amber-50 to-white',
            iconBg: 'bg-amber-100 text-amber-700',
            helper: 'Share of submitted applications with updates',
        },
    ];

    const totalPages = useMemo(() => {
        const totalJobs = jobsQuery.data?.total || 0;
        return Math.max(1, Math.ceil(totalJobs / PAGE_SIZE));
    }, [jobsQuery.data?.total]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    useEffect(() => {
        const visibleIds = new Set((jobsQuery.data?.jobs || []).map((job) => job.id));
        setSelectedJobIds((previous) => previous.filter((jobId) => visibleIds.has(jobId)));
    }, [jobsQuery.data?.jobs]);

    const toggleSelected = (jobId: string) => {
        setSelectedJobIds((previous) =>
            previous.includes(jobId)
                ? previous.filter((id) => id !== jobId)
                : [...previous, jobId]
        );
    };

    const toggleSelectAll = () => {
        const visibleIds = (jobsQuery.data?.jobs || []).map((job) => job.id);
        const allSelected = visibleIds.every((jobId) => selectedJobIds.includes(jobId));
        setSelectedJobIds(allSelected ? [] : visibleIds);
    };

    const analyzeSelected = async () => {
        if (selectedJobIds.length === 0) {
            return;
        }
        await analyzeMutation.mutateAsync(selectedJobIds);
    };

    return (
        <PageWrapper>
            <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className={`overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br ${stat.accent} px-4 py-4 shadow-sm`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400">{stat.label}</p>
                                <p className="mt-3 text-3xl font-bold tracking-tight text-navy">{stat.value}</p>
                            </div>
                            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold ${stat.iconBg}`}>
                                {stat.label.slice(0, 1)}
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">{stat.helper}</p>
                    </div>
                ))}
            </div>

            {analyticsQuery.isError && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Dashboard summary could not be refreshed, but the job feed is still available.
                </div>
            )}

            <div className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <JobFilters
                        search={search}
                        workType={workType}
                        onSearchChange={setSearch}
                        onWorkTypeChange={setWorkType}
                    />
                    <JobFeed
                        jobs={jobsQuery.data?.jobs || []}
                        isLoading={jobsQuery.isLoading}
                        isFetching={jobsQuery.isFetching && !jobsQuery.isLoading}
                        currentPage={jobsQuery.data?.page || page}
                        totalPages={totalPages}
                        totalJobs={jobsQuery.data?.total || 0}
                        pageSize={PAGE_SIZE}
                        selectedJobIds={selectedJobIds}
                        analyzeSelected={() => void analyzeSelected()}
                        onToggleSelected={toggleSelected}
                        onToggleSelectAll={toggleSelectAll}
                        isAnalyzing={analyzeMutation.isPending}
                        onPageChange={setPage}
                    />
                </div>

                <div className="lg:col-span-2">
                    <AgentStatusPanel />
                    <AgentFeed logs={logs} />
                </div>
            </div>
        </PageWrapper>
    );
}
