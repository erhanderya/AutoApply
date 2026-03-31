import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import type { AgentRunStatus, Job } from '../../types';

interface JobCardProps {
    job: Job;
    selected: boolean;
    onToggleSelected: (jobId: string) => void;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getFitScoreBadge(score?: number | null) {
    if (score === undefined || score === null) {
        return <Badge variant="neutral">Pending</Badge>;
    }
    if (score > 75) return <Badge variant="success">{score}%</Badge>;
    if (score >= 50) return <Badge variant="warning">{score}%</Badge>;
    return <Badge variant="danger">{score}%</Badge>;
}

function getRunStatusBadge(status?: AgentRunStatus | null) {
    if (!status || status === 'idle') return <Badge variant="neutral">Idle</Badge>;
    if (status === 'completed') return <Badge variant="success">Ready</Badge>;
    if (status === 'running' || status === 'queued') return <Badge variant="warning">{status}</Badge>;
    return <Badge variant="danger">Failed</Badge>;
}

export function JobCard({ job, selected, onToggleSelected }: JobCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleSelected(job.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo focus:ring-indigo"
                            aria-label={`Select ${job.title}`}
                        />
                    </label>
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
                        ${job.salaryMin?.toLocaleString() || '?'} - ${job.salaryMax?.toLocaleString() || '?'}
                    </span>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Fit Score</p>
                    <div className="mt-1">{getFitScoreBadge(job.fitScore)}</div>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Analyzer</p>
                    <div className="mt-1">{getRunStatusBadge(job.analysisStatus)}</div>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <p className="max-w-[70%] text-xs text-gray-500">
                    {job.description}
                </p>
                <div className="flex gap-2">
                    <Link
                        to={`/jobs/${job.id}`}
                        className="text-xs font-medium text-indigo hover:text-indigo-dark transition-colors"
                    >
                        View Details
                    </Link>
                </div>
            </div>
        </div>
    );
}
