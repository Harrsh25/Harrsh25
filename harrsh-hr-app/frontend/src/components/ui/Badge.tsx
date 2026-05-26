import clsx from 'clsx';
import type { ReactNode } from 'react';

const VARIANTS: Record<string, { bg: string; text: string }> = {
  approved:   { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400' },
  pending:    { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  rejected:   { bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-400' },
  cancelled:  { bg: 'bg-gray-100 dark:bg-gray-700',       text: 'text-gray-600 dark:text-gray-300' },
  draft:      { bg: 'bg-gray-100 dark:bg-gray-700',       text: 'text-gray-600 dark:text-gray-300' },
  active:     { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400' },
  ongoing:    { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400' },
  completed:  { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400' },
  paid:       { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400' },
  processed:  { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400' },
  present:    { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400' },
  absent:     { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400' },
  late:       { bg: 'bg-yellow-100 dark:bg-yellow-900/30',text: 'text-yellow-700 dark:text-yellow-400' },
  half_day:   { bg: 'bg-orange-100 dark:bg-orange-900/30',text: 'text-orange-700 dark:text-orange-400' },
  on_leave:   { bg: 'bg-purple-100 dark:bg-purple-900/30',text: 'text-purple-700 dark:text-purple-400' },
  holiday:    { bg: 'bg-indigo-100 dark:bg-indigo-900/30',text: 'text-indigo-700 dark:text-indigo-400' },
  critical:   { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400' },
  high:       { bg: 'bg-orange-100 dark:bg-orange-900/30',text: 'text-orange-700 dark:text-orange-400' },
  medium:     { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400' },
  low:        { bg: 'bg-gray-100 dark:bg-gray-700',       text: 'text-gray-600 dark:text-gray-300' },
  not_started:{ bg: 'bg-gray-100 dark:bg-gray-700',       text: 'text-gray-600 dark:text-gray-300' },
  in_progress:{ bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400' },
  on_hold:    { bg: 'bg-yellow-100 dark:bg-yellow-900/30',text: 'text-yellow-700 dark:text-yellow-400' },
  verified:   { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400' },
  expired:    { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400' },
};

interface BadgeProps {
  children?: ReactNode;
  status?: string;
  className?: string;
}

const Badge = ({ children, status, className = '' }: BadgeProps) => {
  const key = (status || '').toLowerCase().replace(/ /g, '_');
  const variant = VARIANTS[key] || { bg: 'bg-gray-100', text: 'text-gray-600' };
  const label = children ?? (status ? status.replace(/_/g, ' ') : '');

  return (
    <span className={clsx(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-tight',
      variant.bg, variant.text, className
    )}>
      {typeof label === 'string'
        ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase().replace(/_/g, ' ')
        : label}
    </span>
  );
};

export default Badge;
