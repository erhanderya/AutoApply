import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewPrepService } from '../services/interviewPrep.service';

export function useInterviewPrep(applicationId: string | undefined) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['interview-prep', applicationId],
        queryFn: () => interviewPrepService.getByApplicationId(applicationId!),
        enabled: !!applicationId,
        refetchInterval: (q) => {
            const st = q.state.data?.status;
            return st === 'running' || st === 'queued' ? 2000 : false;
        },
    });

    const regenerate = useMutation({
        mutationFn: () => interviewPrepService.regenerate(applicationId!),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interview-prep', applicationId] }),
    });

    return { prep: query.data, isLoading: query.isLoading, regenerate };
}
