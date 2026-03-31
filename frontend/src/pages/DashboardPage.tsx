import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { JobFilters } from '../components/jobs/JobFilters';
import { JobFeed } from '../components/jobs/JobFeed';
import { AgentStatusPanel } from '../components/agents/AgentStatusPanel';
import { AgentFeed } from '../components/agents/AgentFeed';
import { useAgentFeed } from '../hooks/useAgentFeed';
import { jobsService } from '../services/jobs.service';
import { mockApplications } from '../lib/mockData';

const PAGE_SIZE = 6;

export function DashboardPage() {
    const [search, setSearch] = useState('');
    const [workType, setWorkType] = useState('any');
    const [page, setPage] = useState(1);
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

    const totalApplied = mockApplications.length;
    const thisWeek = mockApplications.filter(
        (a) => Date.now() - new Date(a.submittedAt).getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;
    const interviews = mockApplications.filter((a) => a.status === 'interview').length;
    const responseRate = Math.round(
        (mockApplications.filter((a) => a.status !== 'applied').length / totalApplied) * 100
    );

    const stats = [
        { label: 'Total Applied', value: totalApplied, icon: '\uD83D\uDCE9' },
        { label: 'This Week', value: thisWeek, icon: '\uD83D\uDCC6' },
        { label: 'Interviews', value: interviews, icon: '\uD83C\uDFAF' },
        { label: 'Response Rate', value: `${responseRate}%`, icon: '\uD83D\uDCCA' },
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

    return (
        <PageWrapper>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3"
                    >
                        <span className="text-xl">{stat.icon}</span>
                        <div>
                            <p className="text-lg font-bold text-navy">{stat.value}</p>
                            <p className="text-xs text-gray-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

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
