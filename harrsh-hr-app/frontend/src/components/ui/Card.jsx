import clsx from 'clsx';

const variants = {
  elevated: 'bg-white shadow-sm border border-gray-100',
  flat: 'bg-white border border-gray-200',
  ghost: 'bg-gray-50',
};

const Card = ({ children, variant = 'elevated', className = '', onClick, ...props }) => {
  return (
    <div
      className={clsx(
        'rounded-2xl p-4',
        variants[variant],
        onClick && 'cursor-pointer hover:shadow-md transition-shadow duration-150',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={clsx('mb-3', className)}>{children}</div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={clsx('text-base font-semibold text-gray-900', className)}>{children}</h3>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={clsx('', className)}>{children}</div>
);

export default Card;
