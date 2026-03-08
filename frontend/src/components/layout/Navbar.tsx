import { useAuthStore } from '../../store/authStore';

interface NavbarProps {
    onMenuClick: () => void;
    title: string;
}

export function Navbar({ onMenuClick, title }: NavbarProps) {
    const agentStatuses = useAuthStore((s) => s.agentStatuses);
    const isAnyRunning = Object.values(agentStatuses).some((s) => s === 'running');

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
            {/* Left */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h1 className="text-lg font-semibold text-navy">{title}</h1>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
                {/* Agent Status */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                    <span
                        className={`w-2.5 h-2.5 rounded-full ${isAnyRunning
                                ? 'bg-green-500 animate-pulse-dot'
                                : 'bg-gray-400'
                            }`}
                    />
                    <span className="text-xs font-medium text-gray-600">
                        {isAnyRunning ? 'Agents Running' : 'Agents Idle'}
                    </span>
                </div>

                {/* Notification bell */}
                <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>
            </div>
        </header>
    );
}
