import type { Job } from '../../types';
import { JobCard } from './JobCard';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';

interface JobFeedProps {
    jobs: Job[];
    isLoading: boolean;
}

export function JobFeed({ jobs, isLoading }: JobFeedProps) {
    if (isLoading) {
        return <Spinner className="py-12" />;
    }

    if (jobs.length === 0) {
        return (
            <EmptyState
                icon="🔍"
                title="No jobs found"
                description="Try adjusting your filters or check back later for new opportunities."
            />
        );
    }

    return (
        <div className="space-y-3">
            {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
            ))}
        </div>
    );
}
