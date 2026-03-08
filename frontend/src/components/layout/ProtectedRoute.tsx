import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const accessToken = useAuthStore((s) => s.accessToken);

    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
