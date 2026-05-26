import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

const variants: Record<string, string> = {
  primary:     'bg-[#1a56db] text-white hover:bg-[#1e40af] active:bg-[#1e40af] disabled:opacity-50 shadow-sm',
  secondary:   'bg-[#EFF4FF] text-[#1a56db] hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50',
  destructive: 'bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 disabled:opacity-50 border border-red-200',
  ghost:       'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 disabled:opacity-50',
  success:     'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50',
  danger:      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-50',
};

const sizes: Record<string, string> = {
  sm:   'px-3 py-1.5 text-xs rounded-lg',
  md:   'px-4 py-2 text-sm rounded-xl',
  lg:   'px-5 py-2.5 text-[15px] rounded-xl',
  xl:   'px-6 py-3 text-base rounded-2xl',
  full: 'w-full px-4 py-3 text-sm rounded-xl',
};

interface ButtonProps {
  children?: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: (...args: any[]) => void;
  type?: 'button' | 'submit' | 'reset';
  haptic?: boolean;
  [key: string]: any;
}

const Button = ({
  children, variant = 'primary', size = 'md', loading = false,
  disabled = false, className = '', onClick, type = 'button', haptic = false, ...props
}: ButtonProps) => {
  const handleClick = (...args: any[]) => {
    if (haptic && navigator.vibrate) navigator.vibrate(40);
    onClick?.(...args);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a56db] focus-visible:ring-offset-2',
        'active:scale-[0.97] cursor-pointer select-none',
        variants[variant],
        sizes[size],
        (disabled || loading) && 'cursor-not-allowed active:scale-100',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      {children}
    </button>
  );
};

export default Button;
