import type { ReactNode } from 'react';
import Button from './Button';

interface EmptyStateProps {
  icon?: string | ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    {icon && (
      <div className="text-4xl mb-3 select-none" aria-hidden="true">
        {icon}
      </div>
    )}
    <h3 className="text-[15px] font-semibold text-gray-800 dark:text-gray-200 mb-1">{title}</h3>
    {subtitle && (
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">{subtitle}</p>
    )}
    {actionLabel && onAction && (
      <Button variant="secondary" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;
