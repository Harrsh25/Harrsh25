import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50',
  destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50',
  success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:bg-green-300',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
  full: 'w-full px-4 py-3 text-base',
};

const Button = ({
  children, variant = 'primary', size = 'md', loading = false,
  disabled = false, className = '', onClick, type = 'button', ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer',
        variants[variant],
        sizes[size],
        (disabled || loading) && 'cursor-not-allowed',
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
