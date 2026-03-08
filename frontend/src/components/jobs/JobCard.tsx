import { Badge } from '../ui/Badge';
import type { Job } from '../../types';

interface JobCardProps {
    job: Job;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getFitScoreBadge(score?: number) {
    if (score === undefined || score === null) {
        return <Badge variant="neutral">Pending</Badge>;
    }
    if (score > 75) return <Badge variant="success">{score}%</Badge>;
    if (score >= 50) return <Badge variant="warning">{score}%</Badge>;
    return <Badge variant="danger">{score}%</Badge>;
}

export function JobCard({ job }: JobCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-light to-violet flex items-center justify-center text-white font-bold text-sm">
                        {job.company[0]}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">{job.company}</p>
                        <p className="text-xs text-gray-500">{timeAgo(job.scrapedAt)}</p>
                    </div>
                </div>
                <Badge variant={job.source === 'remoteok' ? 'info' : 'neutral'}>
                    {job.source === 'remoteok' ? 'RemoteOK' : 'Adzuna'}
                </Badge>
            </div>

            <h3 className="text-base font-semibold text-navy mb-2">{job.title}</h3>

            <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location}
                </span>
                <Badge variant={job.workType === 'remote' ? 'success' : job.workType === 'hybrid' ? 'warning' : 'neutral'}>
                    {job.workType}
                </Badge>
                {(job.salaryMin || job.salaryMax) && (
                    <span className="text-xs text-gray-500">
                        ${job.salaryMin?.toLocaleString() || '?'} – ${job.salaryMax?.toLocaleString() || '?'}
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Fit Score:</span>
                    {getFitScoreBadge(job.fitScore)}
                </div>
                <div className="flex gap-2">
                    <button className="text-xs font-medium text-indigo hover:text-indigo-dark transition-colors cursor-pointer">
                        View Details
                    </button>
                    <button className="text-xs font-medium text-violet hover:text-violet-light transition-colors cursor-pointer">
                        Analyze
                    </button>
                </div>
            </div>
        </div>
    );
}
