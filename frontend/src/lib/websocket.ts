import type { WSEvent } from '../types';

type EventHandler = (event: WSEvent) => void;

export class WebSocketManager {
    private ws: WebSocket | null = null;
    private url: string;
    private token: string;
    private handlers: EventHandler[] = [];
    private retryCount = 0;
    private maxRetries = 5;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(url: string, token: string) {
        this.url = url;
        this.token = token;
    }

    connect(): void {
        try {
            this.ws = new WebSocket(`${this.url}?token=${this.token}`);

            this.ws.onopen = () => {
                this.retryCount = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data: WSEvent = JSON.parse(event.data);
                    this.handlers.forEach((handler) => handler(data));
                } catch {
                    console.error('Failed to parse WebSocket message');
                }
            };

            this.ws.onclose = () => {
                this.attemptReconnect();
            };

            this.ws.onerror = () => {
                this.ws?.close();
            };
        } catch {
            this.attemptReconnect();
        }
    }

    private attemptReconnect(): void {
        if (this.retryCount >= this.maxRetries) return;

        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
        this.retryCount++;

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    onEvent(handler: EventHandler): () => void {
        this.handlers.push(handler);
        return () => {
            this.handlers = this.handlers.filter((h) => h !== handler);
        };
    }

    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        this.ws?.close();
        this.ws = null;
        this.handlers = [];
    }
}
