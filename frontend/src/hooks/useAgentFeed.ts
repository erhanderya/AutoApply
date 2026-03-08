import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WebSocketManager } from '../lib/websocket';
import { useAuthStore } from '../store/authStore';
import type { AgentLogEntry, WSEvent, AgentActionPayload, AgentStatusPayload } from '../types';
import { mockAgentLogs } from '../lib/mockData';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';
const MAX_LOG_ENTRIES = 100;

export function useAgentFeed() {
    const [logs, setLogs] = useState<AgentLogEntry[]>(isMock ? mockAgentLogs : []);
    const wsRef = useRef<WebSocketManager | null>(null);
    const accessToken = useAuthStore((s) => s.accessToken);
    const setAgentStatus = useAuthStore((s) => s.setAgentStatus);
    const queryClient = useQueryClient();

    const handleEvent = useCallback(
        (event: WSEvent) => {
            switch (event.type) {
                case 'agent_action': {
                    const payload = event.payload as AgentActionPayload;
                    const newEntry: AgentLogEntry = {
                        id: `log-${Date.now()}`,
                        agentName: payload.agentName,
                        action: payload.action,
                        applicationId: payload.applicationId,
                        timestamp: payload.timestamp,
                    };
                    setLogs((prev) => [newEntry, ...prev].slice(0, MAX_LOG_ENTRIES));
                    break;
                }
                case 'application_update': {
                    queryClient.invalidateQueries({ queryKey: ['applications'] });
                    break;
                }
                case 'agent_status': {
                    const payload = event.payload as AgentStatusPayload;
                    setAgentStatus(payload.agentName, payload.status);
                    break;
                }
            }
        },
        [queryClient, setAgentStatus]
    );

    useEffect(() => {
        if (isMock || !accessToken) return;

        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/agent-feed';
        const manager = new WebSocketManager(wsUrl, accessToken);
        wsRef.current = manager;

        manager.onEvent(handleEvent);
        manager.connect();

        return () => {
            manager.disconnect();
            wsRef.current = null;
        };
    }, [accessToken, handleEvent]);

    return { logs };
}
