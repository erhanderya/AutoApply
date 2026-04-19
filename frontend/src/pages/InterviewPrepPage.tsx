import { useParams, useNavigate } from 'react-router-dom';
import { useApplications } from '../hooks/useApplications';
import { useInterviewPrep } from '../hooks/useInterviewPrep';
import { useAgentFeed } from '../hooks/useAgentFeed';
import { CompanyResearchSection } from '../components/interview/CompanyResearchSection';
import { QuestionList } from '../components/interview/QuestionList';
import { PrepProgressIndicator } from '../components/interview/PrepProgressIndicator';
import { Button } from '../components/ui/Button';

export function InterviewPrepPage() {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const { applications } = useApplications();
    const app = applications.find(a => a.id === applicationId);
    
    const { prep, isLoading, regenerate } = useInterviewPrep(applicationId);
    const { logs } = useAgentFeed();
    const coachLogs = logs.filter(l => l.agentName === 'interview_coach' && l.applicationId === applicationId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo"></div>
            </div>
        );
    }

    if (!app) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Application Not Found</h2>
                <p className="text-gray-500 mb-6">The application you're looking for doesn't exist or you don't have access to it.</p>
                <Button onClick={() => navigate('/applications')}>Back to Applications</Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <button 
                        onClick={() => navigate('/applications')}
                        className="text-sm font-medium text-gray-500 hover:text-indigo flex items-center gap-1 mb-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Kanban
                    </button>
                    <h1 className="text-2xl font-bold text-navy">{app.job.title}</h1>
                    <p className="text-gray-500">{app.job.company}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-violet-100 text-violet-800 border border-violet-200">
                        Interview Prep
                    </span>
                    <Button 
                        variant="secondary" 
                        onClick={() => regenerate.mutate()}
                        disabled={regenerate.isPending || prep?.status === 'running' || prep?.status === 'queued'}
                    >
                        {regenerate.isPending ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                </div>
            </div>

            {/* Progress */}
            <PrepProgressIndicator prep={prep} latestLog={coachLogs[0]} />

            {/* Running / Empty State */}
            {(!prep || prep.status === 'running' || prep.status === 'queued') && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
                                <span className="text-3xl">🎤</span>
                            </div>
                            <div className="absolute top-0 right-0 w-4 h-4 bg-indigo rounded-full animate-ping"></div>
                        </div>
                        <h2 className="text-xl font-bold text-navy">Generating Interview Materials...</h2>
                        <p className="text-gray-500 max-w-md mx-auto">
                            The Interview Coach is researching the company, generating role-specific questions, and crafting STAR answers based on your CV. This might take a minute or two.
                        </p>
                        
                        {/* Live Logs */}
                        {coachLogs.length > 0 && (
                            <div className="mt-8 w-full max-w-2xl bg-slate-50 border border-slate-200 rounded-lg p-4 text-left font-mono text-sm text-slate-600 h-48 overflow-y-auto">
                                <div className="space-y-2">
                                    {coachLogs.slice(0, 10).map((log, i) => (
                                        <div key={log.id} className="flex gap-3">
                                            <span className="text-slate-400 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                            <span className={i === 0 ? 'text-indigo font-semibold' : ''}>{log.action}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Failed State */}
            {prep?.status === 'failed' && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Pipeline Failed</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{prep.errorMessage || 'An unexpected error occurred during the interview prep generation.'}</p>
                            </div>
                            <div className="mt-4">
                                <Button variant="danger" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Completed State */}
            {prep?.status === 'completed' && (
                <div className="space-y-6">
                    <CompanyResearchSection research={prep.companyResearch} />
                    <QuestionList questions={prep.questions} answers={prep.answers} />
                </div>
            )}
        </div>
    );
}
