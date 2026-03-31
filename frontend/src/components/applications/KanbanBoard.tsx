import { useState, type DragEvent } from 'react';
import type { Application, ApplicationStatus } from '../../types';
import { ApplicationCard } from './ApplicationCard';
import { CoverLetterModal } from './CoverLetterModal';

interface KanbanBoardProps {
    applications: Application[];
    onStatusChange: (id: string, status: ApplicationStatus) => Promise<void>;
    onSaveCoverLetter: (id: string, text: string) => Promise<void>;
}

const columns: { key: ApplicationStatus; label: string; color: string }[] = [
    { key: 'pending', label: 'Draft', color: 'border-slate-400' },
    { key: 'applied', label: 'Applied', color: 'border-indigo' },
    { key: 'in_review', label: 'In Review', color: 'border-yellow-500' },
    { key: 'interview', label: 'Interview', color: 'border-violet' },
    { key: 'offer', label: 'Offer', color: 'border-green-500' },
    { key: 'rejected', label: 'Rejected', color: 'border-red-500' },
];

const statusColors: Record<ApplicationStatus, string> = {
    pending: 'bg-slate-100 text-slate-700',
    applied: 'bg-indigo-100 text-indigo-700',
    in_review: 'bg-yellow-100 text-yellow-700',
    interview: 'bg-violet-100 text-violet-700',
    offer: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
};

export function KanbanBoard({ applications, onStatusChange, onSaveCoverLetter }: KanbanBoardProps) {
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);

    const handleDragOver = (e: DragEvent, column: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(column);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = async (e: DragEvent, status: ApplicationStatus) => {
        e.preventDefault();
        setDragOverColumn(null);
        const applicationId = e.dataTransfer.getData('applicationId');
        if (applicationId) {
            await onStatusChange(applicationId, status);
        }
    };

    return (
        <>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {columns.map((column) => {
                    const columnApps = applications.filter((a) => a.status === column.key);
                    const isDragOver = dragOverColumn === column.key;

                    return (
                        <div
                            key={column.key}
                            className={`flex-shrink-0 w-64 flex flex-col rounded-xl bg-gray-50 border-t-2 ${column.color}
                ${isDragOver ? 'kanban-drop-active' : ''}`}
                            onDragOver={(e) => handleDragOver(e, column.key)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, column.key)}
                        >
                            {/* Column header */}
                            <div className="flex items-center justify-between px-3 py-2.5">
                                <h3 className="text-sm font-semibold text-gray-700">{column.label}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[column.key]}`}>
                                    {columnApps.length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className="flex-1 px-2 pb-2 space-y-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-280px)]">
                                {columnApps.map((app) => (
                                    <ApplicationCard
                                        key={app.id}
                                        application={app}
                                        onViewCoverLetter={setSelectedApp}
                                    />
                                ))}

                                {columnApps.length === 0 && (
                                    <div className="flex items-center justify-center h-24 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg">
                                        No applications
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <CoverLetterModal
                application={selectedApp}
                isOpen={!!selectedApp}
                onClose={() => setSelectedApp(null)}
                onSave={onSaveCoverLetter}
            />
        </>
    );
}
