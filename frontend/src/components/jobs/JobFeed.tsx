import type { Job } from '../../types';
import { JobCard } from './JobCard';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

interface JobFeedProps {
    jobs: Job[];
    isLoading: boolean;
    isFetching?: boolean;
    currentPage: number;
    totalPages: number;
    totalJobs: number;
    pageSize: number;
    selectedJobIds: string[];
    analyzeSelected: () => void;
    onToggleSelected: (jobId: string) => void;
    onToggleSelectAll: () => void;
    isAnalyzing: boolean;
    onPageChange: (page: number) => void;
}

function buildPageNumbers(currentPage: number, totalPages: number): number[] {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);

    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
}

export function JobFeed({
    jobs,
    isLoading,
    isFetching = false,
    currentPage,
    totalPages,
    totalJobs,
    pageSize,
    selectedJobIds,
    analyzeSelected,
    onToggleSelected,
    onToggleSelectAll,
    isAnalyzing,
    onPageChange,
}: JobFeedProps) {
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

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalJobs);
    const pages = buildPageNumbers(currentPage, totalPages);
    const allVisibleSelected = jobs.every((job) => selectedJobIds.includes(job.id));

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-500">
                        Showing <span className="font-semibold text-navy">{start}</span>-<span className="font-semibold text-navy">{end}</span> of <span className="font-semibold text-navy">{totalJobs}</span> jobs
                    </p>
                    {isFetching && (
                        <span className="text-xs font-medium text-indigo">Loading next page...</span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onToggleSelectAll}>
                        {allVisibleSelected ? 'Clear Page' : 'Select Page'}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={analyzeSelected}
                        loading={isAnalyzing}
                        disabled={selectedJobIds.length === 0}
                    >
                        Analyze Selected ({selectedJobIds.length})
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {jobs.map((job) => (
                    <JobCard
                        key={job.id}
                        job={job}
                        selected={selectedJobIds.includes(job.id)}
                        onToggleSelected={onToggleSelected}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {pages.map((page) => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => onPageChange(page)}
                                className={`min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                                    page === currentPage
                                        ? 'bg-indigo text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
