import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WebSocketManager } from '../lib/websocket';
import { useAuthStore } from '../store/authStore';
import type { AgentActionPayload, AgentLogEntry, AgentStatusPayload, WSEvent } from '../types';
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
                        jobId: payload.jobId,
                        timestamp: payload.timestamp,
                    };
                    setLogs((prev) => [newEntry, ...prev].slice(0, MAX_LOG_ENTRIES));
                    break;
                }
                case 'application_update': {
                    queryClient.invalidateQueries({ queryKey: ['applications'] });
                    queryClient.invalidateQueries({ queryKey: ['jobs'] });
                    queryClient.invalidateQueries({ queryKey: ['job-detail'] });
                    break;
                }
                case 'agent_status': {
                    const payload = event.payload as AgentStatusPayload;
                    const normalizedStatus = payload.status === 'error' ? 'error' : payload.status === 'failed' ? 'error' : payload.status === 'running' ? 'running' : 'idle';
                    setAgentStatus(payload.agentName, normalizedStatus);
                    break;
                }
            }
        },
        [queryClient, setAgentStatus]
    );

    useEffect(() => {
        if (isMock || !accessToken) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws/agent-feed`;
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
