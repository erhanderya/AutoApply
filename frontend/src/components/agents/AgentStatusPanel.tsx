import { useAuthStore } from '../../store/authStore';

const agents = [
    { name: 'scout', label: 'Scout', icon: '🔎', color: 'bg-indigo/10 text-indigo' },
    { name: 'analyzer', label: 'Analyzer', icon: '📊', color: 'bg-teal/10 text-teal' },
    { name: 'writer', label: 'Writer', icon: '✍️', color: 'bg-violet/10 text-violet' },
    { name: 'apply', label: 'Apply', icon: '📨', color: 'bg-green-50 text-green-600' },
    { name: 'tracker', label: 'Tracker', icon: '📈', color: 'bg-orange-50 text-orange-500' },
];

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    idle: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Idle' },
    running: { bg: 'bg-green-100', text: 'text-green-700', label: 'Running' },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
};

export function AgentStatusPanel() {
    const agentStatuses = useAuthStore((s) => s.agentStatuses);

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-navy mb-3">Agent Status</h3>
            <div className="grid grid-cols-5 gap-2">
                {agents.map((agent) => {
                    const status = agentStatuses[agent.name] || 'idle';
                    const style = statusStyles[status];
                    return (
                        <div
                            key={agent.name}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg ${agent.color}`}
                        >
                            <span className="text-xl">{agent.icon}</span>
                            <span className="text-xs font-medium">{agent.label}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                                {style.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
