import type { AgentLogEntry } from '../../types';

const agentConfig: Record<string, { icon: string; color: string }> = {
    scout: { icon: '🔎', color: 'text-indigo' },
    analyzer: { icon: '📊', color: 'text-teal' },
    writer: { icon: '✍️', color: 'text-violet' },
    apply: { icon: '📨', color: 'text-green-600' },
    tracker: { icon: '📈', color: 'text-orange-500' },
    interview_coach: { icon: '🎤', color: 'text-pink-500' },
};

interface AgentLogItemProps {
    log: AgentLogEntry;
}

export function AgentLogItem({ log }: AgentLogItemProps) {
    const config = agentConfig[log.agentName] || { icon: '🤖', color: 'text-gray-500' };
    const time = new Date(log.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    return (
        <div className="flex gap-3 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors">
            <span className="text-lg mt-0.5">{config.icon}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold capitalize ${config.color}`}>
                        {log.agentName}
                    </span>
                    <span className="text-xs text-gray-400">{time}</span>
                </div>
                <p className="text-sm text-gray-700 font-mono leading-snug">{log.action}</p>
            </div>
        </div>
    );
}
