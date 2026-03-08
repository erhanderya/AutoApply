import { useEffect, useRef } from 'react';
import type { AgentLogEntry } from '../../types';
import { AgentLogItem } from './AgentLogItem';

interface AgentFeedProps {
    logs: AgentLogEntry[];
}

export function AgentFeed({ logs }: AgentFeedProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-navy flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
                    Agent Activity Feed
                </h3>
            </div>
            <div
                ref={scrollRef}
                className="max-h-[400px] overflow-y-auto agent-feed-scroll divide-y divide-gray-50"
            >
                {logs.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">
                        No agent activity yet...
                    </div>
                ) : (
                    logs.map((log) => <AgentLogItem key={log.id} log={log} />)
                )}
            </div>
        </div>
    );
}
