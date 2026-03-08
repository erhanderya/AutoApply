import type { ReactNode } from 'react';

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: ReactNode;
    trend?: string;
    color?: string;
}

export function StatsCard({ label, value, icon, trend, color = 'bg-indigo' }: StatsCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${color} bg-opacity-10 flex items-center justify-center text-xl`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-navy">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
    );
}
