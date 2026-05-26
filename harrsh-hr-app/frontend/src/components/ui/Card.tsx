import clsx from 'clsx';
import type { ReactNode } from 'react';

const variants: Record<string, string> = {
  elevated: 'bg-white dark:bg-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-gray-700',
  flat:     'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  ghost:    'bg-gray-50 dark:bg-gray-800/50',
};

interface CardProps {
  children?: ReactNode;
  variant?: 'elevated' | 'flat' | 'ghost';
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}

const Card = ({ children, variant = 'elevated', className = '', onClick, ...props }: CardProps) => (
  <div
    className={clsx(
      'rounded-2xl p-4',
      variants[variant],
      onClick && 'cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] active:scale-[0.99] transition-all duration-150',
      className
    )}
    onClick={onClick}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <div className={clsx('mb-3', className)}>{children}</div>
);

export const CardTitle = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <h3 className={clsx('text-[15px] font-semibold text-gray-900 dark:text-gray-100', className)}>{children}</h3>
);

export const CardBody = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <div className={clsx('', className)}>{children}</div>
);

export default Card;
