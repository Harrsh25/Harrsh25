import clsx from 'clsx';

const colorMap = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
  orange: 'bg-orange-100 text-orange-800',
  indigo: 'bg-indigo-100 text-indigo-800',
};

const statusColorMap = {
  APPROVED: 'green', PENDING: 'yellow', REJECTED: 'red', CANCELLED: 'gray',
  PRESENT: 'green', ABSENT: 'red', LATE: 'yellow', HALF_DAY: 'orange', ON_LEAVE: 'blue', HOLIDAY: 'purple',
  ACTIVE: 'blue', ON_HOLD: 'yellow', COMPLETED: 'green',
  NOT_STARTED: 'gray', IN_PROGRESS: 'blue',
  DRAFT: 'gray', PROCESSED: 'blue', PAID: 'green',
  LOW: 'gray', MEDIUM: 'blue', HIGH: 'orange', CRITICAL: 'red',
};

const Badge = ({ children, color, status, size = 'sm', className = '' }) => {
  const resolvedColor = color || (status && statusColorMap[status]) || 'gray';
  const colorClass = colorMap[resolvedColor] || colorMap.gray;

  return (
    <span className={clsx(
      'inline-flex items-center rounded-full font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      colorClass,
      className
    )}>
      {children || status?.replace(/_/g, ' ')}
    </span>
  );
};

export default Badge;
