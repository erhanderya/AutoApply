import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const navItems = [
    {
        to: '/dashboard',
        label: 'Dashboard',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        to: '/scout',
        label: 'Scout',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18l-2.904.813a1 1 0 01-1.2-1.2L5.71 15l-.814-2.904a1 1 0 011.2-1.2L9 11.71l2.904-.814a1 1 0 011.2 1.2L12.29 15l.813 2.904a1 1 0 01-1.2 1.2L9.813 15.904zM18 13a5 5 0 100-10 5 5 0 000 10zM18 13v8m0 0l-3-3m3 3l3-3" />
            </svg>
        ),
    },
    {
        to: '/applications',
        label: 'Applications',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        ),
    },
    {
        to: '/analytics',
        label: 'Analytics',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        to: '/profile',
        label: 'Profile',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A11.955 11.955 0 0112 15c2.53 0 4.877.783 6.879 2.117M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const user = useAuthStore((s) => s.user);
    const clearAuth = useAuthStore((s) => s.clearAuth);

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full bg-navy text-white transition-transform duration-300 ease-in-out
          w-60 flex flex-col
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-indigo flex items-center justify-center font-bold text-sm">
                        ⚡
                    </div>
                    <span className="text-lg font-bold tracking-tight">AutoApply</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200
                ${isActive
                                    ? 'bg-indigo text-white'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-violet flex items-center justify-center text-sm font-semibold">
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.email || 'User'}</p>
                            <button
                                onClick={() => {
                                    clearAuth();
                                    window.location.href = '/login';
                                }}
                                className="text-xs text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
