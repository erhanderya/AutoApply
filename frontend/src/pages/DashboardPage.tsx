import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { JobFilters } from '../components/jobs/JobFilters';
import { JobFeed } from '../components/jobs/JobFeed';
import { AgentStatusPanel } from '../components/agents/AgentStatusPanel';
import { AgentFeed } from '../components/agents/AgentFeed';
import { useAgentFeed } from '../hooks/useAgentFeed';
import { jobsService } from '../services/jobs.service';
import { mockApplications } from '../lib/mockData';

export function DashboardPage() {
    const [search, setSearch] = useState('');
    const [workType, setWorkType] = useState('any');
    const { logs } = useAgentFeed();

    const jobsQuery = useQuery({
        queryKey: ['jobs', { search, workType }],
        queryFn: () => jobsService.getJobs({ search, workType: workType !== 'any' ? workType : undefined }),
    });

    // Quick stats (from mock data in mock mode)
    const totalApplied = mockApplications.length;
    const thisWeek = mockApplications.filter(
        (a) => Date.now() - new Date(a.submittedAt).getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;
    const interviews = mockApplications.filter((a) => a.status === 'interview').length;
    const responseRate = Math.round(
        (mockApplications.filter((a) => a.status !== 'applied').length / totalApplied) * 100
    );

    const stats = [
        { label: 'Total Applied', value: totalApplied, icon: '📩' },
        { label: 'This Week', value: thisWeek, icon: '📅' },
        { label: 'Interviews', value: interviews, icon: '🎯' },
        { label: 'Response Rate', value: `${responseRate}%`, icon: '📊' },
    ];

    return (
        <PageWrapper>
            {/* Quick Stats Bar */}
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

            {/* Main Content */}
            <div className="grid lg:grid-cols-5 gap-6">
                {/* Left — Job Feed (60%) */}
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
                    />
                </div>

                {/* Right — Agent Activity (40%) */}
                <div className="lg:col-span-2">
                    <AgentStatusPanel />
                    <AgentFeed logs={logs} />
                </div>
            </div>
        </PageWrapper>
    );
}
