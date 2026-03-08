import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { AnalyticsSummary } from '../../types';

const COLORS = ['#4F46E5', '#EAB308', '#7C3AED', '#059669', '#EF4444'];
const STATUS_LABELS: Record<string, string> = {
    applied: 'Applied',
    in_review: 'In Review',
    interview: 'Interview',
    offer: 'Offer',
    rejected: 'Rejected',
};

interface ChartProps {
    data: AnalyticsSummary;
}

export function WeeklyApplicationsChart({ data }: ChartProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-navy mb-4">Applications per Day (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.applicationsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(val) => new Date(val).toLocaleDateString()}
                    />
                    <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function StatusBreakdownChart({ data }: ChartProps) {
    const pieData = Object.entries(data.applicationsByStatus).map(([key, value]) => ({
        name: STATUS_LABELS[key] || key,
        value,
    }));

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-navy mb-4">Applications by Status</h3>
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                    >
                        {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function FitScoreDistribution({ data }: ChartProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-navy mb-4">Fit Score Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.fitScoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function ResponseTimeChart() {
    // Mock response time data
    const responseData = [
        { source: 'RemoteOK', avgDays: 5.2 },
        { source: 'Adzuna', avgDays: 7.8 },
        { source: 'Direct', avgDays: 3.1 },
    ];

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-navy mb-4">Avg. Response Time by Source</h3>
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={responseData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} unit=" days" />
                    <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="avgDays" fill="#0891B2" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
