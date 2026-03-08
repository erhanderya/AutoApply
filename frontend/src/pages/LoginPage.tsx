import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
    const { login, loginPending, loginError, isAuthenticated } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const onSubmit = async (data: LoginFormData) => {
        try {
            await login(data);
        } catch {
            // Error handled by mutation
        }
    };

    return (
        <div className="min-h-screen bg-navy flex items-center justify-center p-4">
            <div className="absolute inset-0 opacity-10 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-violet rounded-full blur-[100px]" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-white">
                        <span className="text-2xl">⚡</span>
                        <span className="text-xl font-bold">AutoApply</span>
                    </Link>
                </div>

                {/* Form card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-2xl font-bold text-navy mb-1">Welcome back</h2>
                    <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

                    {loginError && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">
                            Invalid email or password. Please try again.
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            error={errors.email?.message}
                            {...register('email')}
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            error={errors.password?.message}
                            {...register('password')}
                        />
                        <Button type="submit" loading={loginPending} className="w-full">
                            Sign In
                        </Button>
                    </form>

                    <p className="text-sm text-gray-500 text-center mt-6">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-indigo font-medium hover:underline">
                            Sign up free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
