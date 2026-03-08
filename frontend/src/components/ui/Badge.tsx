import type { ReactNode } from 'react';

interface BadgeProps {
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    children: ReactNode;
    className?: string;
}

const variantClasses = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-indigo-100 text-indigo-700',
    neutral: 'bg-gray-100 text-gray-600',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variantClasses[variant]} ${className}`}
        >
            {children}
        </span>
    );
}
