import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authBootstrapped = useAuthStore((s) => s.authBootstrapped);

    if (!authBootstrapped) {
        return null;
    }

    if (!accessToken) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
