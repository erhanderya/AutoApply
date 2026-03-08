import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { StatsCard } from '../components/analytics/StatsCard';
import {
    WeeklyApplicationsChart,
    StatusBreakdownChart,
    FitScoreDistribution,
    ResponseTimeChart,
} from '../components/analytics/Charts';
import { Spinner } from '../components/ui/Spinner';
import { analyticsService } from '../services/analytics.service';

export function AnalyticsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['analytics', 'summary'],
        queryFn: () => analyticsService.getSummary(),
    });

    if (isLoading || !data) {
        return (
            <PageWrapper>
                <Spinner className="py-20" size="lg" />
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatsCard
                    label="Total Applications"
                    value={data.totalApplications}
                    icon="📩"
                    trend="+12%"
                />
                <StatsCard
                    label="Response Rate"
                    value={`${data.responseRate}%`}
                    icon="📊"
                    trend="+5%"
                    color="bg-teal"
                />
                <StatsCard
                    label="Avg. Fit Score"
                    value={data.avgFitScore}
                    icon="🎯"
                    color="bg-violet"
                />
                <StatsCard
                    label="Interviews Scheduled"
                    value={data.interviewsScheduled}
                    icon="🗓"
                    trend="+2"
                    color="bg-green-500"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                <WeeklyApplicationsChart data={data} />
                <StatusBreakdownChart data={data} />
                <FitScoreDistribution data={data} />
                <ResponseTimeChart />
            </div>
        </PageWrapper>
    );
}
