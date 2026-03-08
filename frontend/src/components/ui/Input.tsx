import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="space-y-1">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-gray-700"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`w-full px-3 py-2 rounded-lg border text-sm
            transition-colors duration-200 bg-white
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo
            ${error ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500' : 'border-gray-300'}
            ${className}`}
                    {...props}
                />
                {error && (
                    <p className="text-xs text-red-500 mt-1">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
