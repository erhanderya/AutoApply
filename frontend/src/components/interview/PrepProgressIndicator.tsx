import type { AgentLogEntry, InterviewPrep } from '../../types';

interface Props {
    prep: InterviewPrep | null | undefined;
    latestLog?: AgentLogEntry;
}

const STAGES = [
    { id: 'research', label: 'Company Research', icon: '🔍' },
    { id: 'questions', label: 'Question Generation', icon: '🧠' },
    { id: 'answers', label: 'STAR Answers', icon: '⭐' },
];

export function PrepProgressIndicator({ prep, latestLog }: Props) {
    if (!prep || prep.status === 'idle' || prep.status === 'failed') return null;

    let activeIndex = 0;
    if (prep.status === 'completed') {
        activeIndex = 3; // all done
    } else if (latestLog?.action) {
        const action = latestLog.action.toLowerCase();
        if (action.includes('star') || action.includes('answer')) activeIndex = 2;
        else if (action.includes('question') || action.includes('generation')) activeIndex = 1;
        else activeIndex = 0;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-navy">Pipeline Progress</h3>
                {prep.status === 'running' && (
                    <span className="flex items-center gap-2 text-sm font-medium text-indigo">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo"></span>
                        </span>
                        Running...
                    </span>
                )}
                {prep.status === 'completed' && (
                    <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Completed
                    </span>
                )}
            </div>

            <div className="relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full"></div>
                
                {/* Progress bar fill */}
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo rounded-full transition-all duration-500 ease-in-out"
                    style={{ width: `${(Math.min(activeIndex, STAGES.length - 1) / (STAGES.length - 1)) * 100}%` }}
                ></div>

                <div className="relative flex justify-between">
                    {STAGES.map((stage, index) => {
                        const isCompleted = activeIndex > index;
                        const isActive = activeIndex === index && prep.status === 'running';

                        return (
                            <div key={stage.id} className="flex flex-col items-center">
                                <div 
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white z-10 transition-colors duration-300
                                        ${isCompleted ? 'border-indigo text-indigo' : 
                                          isActive ? 'border-indigo text-indigo ring-4 ring-indigo/20' : 
                                          'border-gray-300 text-gray-400'}`}
                                >
                                    {isCompleted ? (
                                        <svg className="w-5 h-5 text-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className="text-lg">{stage.icon}</span>
                                    )}
                                </div>
                                <span className={`mt-2 text-xs font-medium ${isActive ? 'text-indigo' : isCompleted ? 'text-slate-700' : 'text-gray-400'}`}>
                                    {stage.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
