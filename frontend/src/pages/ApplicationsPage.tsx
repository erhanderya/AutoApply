import { PageWrapper } from '../components/layout/PageWrapper';
import { KanbanBoard } from '../components/applications/KanbanBoard';
import { Spinner } from '../components/ui/Spinner';
import { useApplications } from '../hooks/useApplications';

export function ApplicationsPage() {
    const { applications, isLoading, updateStatus, updateCoverLetter } = useApplications();

    if (isLoading) {
        return (
            <PageWrapper>
                <Spinner className="py-20" size="lg" />
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-navy">Application Tracker</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Drag and drop cards between columns to update their status.
                </p>
            </div>
            <KanbanBoard
                applications={applications}
                onStatusChange={async (id, status) => { await updateStatus({ id, status }); }}
                onSaveCoverLetter={async (id, text) => { await updateCoverLetter({ id, text }); }}
            />
        </PageWrapper>
    );
}
