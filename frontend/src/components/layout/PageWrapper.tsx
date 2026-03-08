import type { ReactNode } from 'react';

interface PageWrapperProps {
    children: ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
    return (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            {children}
        </div>
    );
}
