import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import type { LoginRequest, RegisterRequest } from '../types';

export function useAuth() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, accessToken, setAuth, clearAuth } = useAuthStore();

    const meQuery = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: () => authService.getMe(),
        enabled: !!accessToken,
        retry: false,
    });

    const loginMutation = useMutation({
        mutationFn: (data: LoginRequest) => authService.login(data),
        onSuccess: (response) => {
            setAuth(response.user, response.access_token);
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            navigate('/dashboard');
        },
    });

    const registerMutation = useMutation({
        mutationFn: (data: RegisterRequest) => authService.register(data),
        onSuccess: (response) => {
            setAuth(response.user, response.access_token);
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
            navigate('/dashboard');
        },
    });

    const logout = () => {
        clearAuth();
        queryClient.clear();
        navigate('/login');
    };

    return {
        user: meQuery.data || user,
        isAuthenticated: !!accessToken,
        isLoading: meQuery.isLoading,
        login: loginMutation.mutateAsync,
        loginError: loginMutation.error,
        loginPending: loginMutation.isPending,
        register: registerMutation.mutateAsync,
        registerError: registerMutation.error,
        registerPending: registerMutation.isPending,
        logout,
    };
}
