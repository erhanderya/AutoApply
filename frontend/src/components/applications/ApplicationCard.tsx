import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import type { Application } from '../../types';

interface ApplicationCardProps {
    application: Application;
    onViewCoverLetter: (app: Application) => void;
}

function daysAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
}

export function ApplicationCard({ application, onViewCoverLetter }: ApplicationCardProps) {
    const fitVariant = application.fitScore > 75 ? 'success' : application.fitScore >= 50 ? 'warning' : 'danger';
    const subtitle = application.status === 'pending' ? 'Draft analysis' : daysAgo(application.submittedAt);

    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('applicationId', application.id);
                e.dataTransfer.effectAllowed = 'move';
            }}
            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-grab active:cursor-grabbing flex flex-col h-full"
        >
            <h4 className="text-sm font-semibold text-navy mb-1 truncate">{application.job.title}</h4>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">{application.job.company}</span>
                <span className="text-xs text-gray-400">-</span>
                <span className="text-xs text-gray-400">{subtitle}</span>
            </div>
            
            <div className="flex-1"></div>
            
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <Badge variant={fitVariant}>{application.fitScore}%</Badge>
                
                <div className="flex items-center gap-3">
                    {application.status === 'interview' && (
                        <Link
                            to={`/applications/${application.id}/interview-prep`}
                            className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                        >
                            Interview Prep
                        </Link>
                    )}
                    {application.coverLetterText && (
                        <button
                            onClick={() => onViewCoverLetter(application)}
                            className="text-xs text-indigo hover:text-indigo-dark font-medium transition-colors cursor-pointer"
                        >
                            Cover Letter
                        </button>
                    )}
                </div>
            </div>
            {application.followUpScheduledAt && (
                <div className="mt-2 text-[11px] text-orange-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Follow-up scheduled
                </div>
            )}
        </div>
    );
}
