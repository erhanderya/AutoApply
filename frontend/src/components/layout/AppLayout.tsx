import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/scout': 'Scout',
    '/applications': 'Applications',
    '/analytics': 'Analytics',
    '/profile': 'Profile',
    '/onboarding': 'Get Started',
};

export function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const title = pageTitles[location.pathname] || 'AutoApply';

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar onMenuClick={() => setSidebarOpen(true)} title={title} />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
