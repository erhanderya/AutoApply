import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsService } from '../services/applications.service';
import type { ApplicationStatus } from '../types';

export function useApplications() {
    const queryClient = useQueryClient();

    const applicationsQuery = useQuery({
        queryKey: ['applications'],
        queryFn: () => applicationsService.getAll(),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
            applicationsService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => applicationsService.approve(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });

    const updateCoverLetterMutation = useMutation({
        mutationFn: ({ id, text }: { id: string; text: string }) =>
            applicationsService.updateCoverLetter(id, text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });

    return {
        applications: applicationsQuery.data || [],
        isLoading: applicationsQuery.isLoading,
        error: applicationsQuery.error,
        updateStatus: updateStatusMutation.mutateAsync,
        approve: approveMutation.mutateAsync,
        updateCoverLetter: updateCoverLetterMutation.mutateAsync,
    };
}
