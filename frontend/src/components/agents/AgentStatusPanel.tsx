import { useAuthStore } from '../../store/authStore';

const agents = [
    {
        name: 'scout',
        label: 'Scout',
        accent: 'bg-indigo/10 text-indigo',
        description: 'Finds and refreshes matching jobs.',
    },
    {
        name: 'analyzer',
        label: 'Analyzer',
        accent: 'bg-teal/10 text-teal',
        description: 'Scores fit and extracts skill gaps.',
    },
    {
        name: 'writer',
        label: 'Writer',
        accent: 'bg-violet/10 text-violet',
        description: 'Generates CV variants and cover letters.',
    },
    {
        name: 'interview_coach',
        label: 'Interview Coach',
        accent: 'bg-pink-500/10 text-pink-500',
        description: 'Prepares company research, questions and STAR answers.',
    },
];

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    idle: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Idle' },
    running: { bg: 'bg-green-100', text: 'text-green-700', label: 'Running' },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Issue' },
};

export function AgentStatusPanel() {
    const agentStatuses = useAuthStore((s) => s.agentStatuses);

    return (
        <div className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-navy">Agent Status</h3>
                    <p className="mt-1 text-xs text-gray-500">Dashboard now tracks only the active core agents.</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                    {agents.length} active agents
                </span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                {agents.map((agent) => {
                    const status = agentStatuses[agent.name] || 'idle';
                    const style = statusStyles[status];

                    return (
                        <div key={agent.name} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div
                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ${agent.accent}`}
                                >
                                    {agent.label.slice(0, 1)}
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${style.bg} ${style.text}`}>
                                    {style.label}
                                </span>
                            </div>

                            <div className="mt-3">
                                <p className="text-sm font-semibold text-navy">{agent.label}</p>
                                <p className="mt-1 text-xs leading-5 text-gray-500">{agent.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
